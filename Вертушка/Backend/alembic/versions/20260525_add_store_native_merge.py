"""Add merge fields for store-native ↔ discogs records

Revision ID: 20260525_merge
Revises: 20260521_store_native
Create Date: 2026-05-25

Поля:
  records.merged_into_id                       — soft-delete: указывает на
                                                  актуальный Record куда смержили
  records.discogs_id_candidate_first_seen_at   — когда candidate появился впервые
  records.discogs_id_candidate_confirmations   — счётчик повторных подтверждений
                                                  (для авто-merge нужно ≥ 2)

Таблица record_merge_history — audit trail для каждого merge'а (cron или CLI).
Сама запись после merge остаётся в БД (с merged_into_id != NULL), чтобы старые
ссылки на uuid не ломались. Витрины Маркета фильтруют по merged_into_id IS NULL.

Идемпотентна.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "20260525_merge"
down_revision = "20260521_store_native"
branch_labels = None
depends_on = None


def _column_exists(conn, table: str, column: str) -> bool:
    return bool(conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :table "
            "AND column_name = :column)"
        ),
        {"table": table, "column": column},
    ).scalar())


def _index_exists(conn, name: str) -> bool:
    return bool(conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM pg_indexes "
            "WHERE schemaname = 'public' AND indexname = :name)"
        ),
        {"name": name},
    ).scalar())


def _table_exists(conn, name: str) -> bool:
    return bool(conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :name)"
        ),
        {"name": name},
    ).scalar())


def upgrade() -> None:
    conn = op.get_bind()

    if not _column_exists(conn, "records", "merged_into_id"):
        op.add_column(
            "records",
            sa.Column(
                "merged_into_id",
                UUID(as_uuid=True),
                sa.ForeignKey("records.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )

    if not _index_exists(conn, "ix_records_merged_into_id"):
        op.create_index(
            "ix_records_merged_into_id", "records", ["merged_into_id"],
            postgresql_where=sa.text("merged_into_id IS NOT NULL"),
        )

    if not _column_exists(conn, "records", "discogs_id_candidate_first_seen_at"):
        op.add_column(
            "records",
            sa.Column(
                "discogs_id_candidate_first_seen_at",
                sa.DateTime,
                nullable=True,
            ),
        )

    if not _column_exists(conn, "records", "discogs_id_candidate_confirmations"):
        op.add_column(
            "records",
            sa.Column(
                "discogs_id_candidate_confirmations",
                sa.Integer,
                nullable=False,
                server_default="0",
            ),
        )

    if not _table_exists(conn, "record_merge_history"):
        op.create_table(
            "record_merge_history",
            sa.Column(
                "id", UUID(as_uuid=True),
                primary_key=True,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column(
                "source_record_id", UUID(as_uuid=True),
                nullable=False, index=True,
            ),
            sa.Column(
                "target_record_id", UUID(as_uuid=True),
                sa.ForeignKey("records.id", ondelete="SET NULL"),
                nullable=True, index=True,
            ),
            # Snapshot полей source: пригождается если когда-нибудь захотим
            # ревёртнуть merge или разобрать, что именно объединили.
            sa.Column("source_artist", sa.Text, nullable=True),
            sa.Column("source_title", sa.Text, nullable=True),
            sa.Column("source_year", sa.Integer, nullable=True),
            sa.Column("source_discogs_id_candidate", sa.String(50), nullable=True),
            sa.Column("listings_remapped", sa.Integer, nullable=False, server_default="0"),
            sa.Column("merged_by", sa.String(32), nullable=False),  # "cron" / "cli" / "manual"
            sa.Column(
                "created_at", sa.DateTime,
                nullable=False, server_default=sa.text("now()"),
            ),
        )


def downgrade() -> None:
    op.drop_table("record_merge_history")
    op.drop_column("records", "discogs_id_candidate_confirmations")
    op.drop_column("records", "discogs_id_candidate_first_seen_at")
    op.execute("DROP INDEX IF EXISTS ix_records_merged_into_id")
    op.drop_column("records", "merged_into_id")
