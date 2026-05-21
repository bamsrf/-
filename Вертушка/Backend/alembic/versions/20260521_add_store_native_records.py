"""Add records.source + discogs_id_candidate for store-native listings

Revision ID: 20260521_store_native
Revises: 20260519_privacy
Create Date: 2026-05-21

Идемпотентна.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260521_store_native"
down_revision = "20260519_privacy"
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


def upgrade() -> None:
    conn = op.get_bind()

    if not _column_exists(conn, "records", "source"):
        op.add_column(
            "records",
            sa.Column(
                "source",
                sa.String(length=20),
                nullable=False,
                server_default="discogs",
            ),
        )

    if not _column_exists(conn, "records", "discogs_id_candidate"):
        op.add_column(
            "records",
            sa.Column("discogs_id_candidate", sa.String(length=50), nullable=True),
        )

    if not _index_exists(conn, "ix_records_source"):
        op.create_index("ix_records_source", "records", ["source"])

    # Partial unique index: дедуп store-native записей по (lower(artist), lower(title), year).
    # Не используем регулярный UniqueConstraint — он бы покрывал всю таблицу.
    if not _index_exists(conn, "uq_store_native_artist_title_year"):
        op.execute(
            "CREATE UNIQUE INDEX uq_store_native_artist_title_year "
            "ON records (lower(artist), lower(title), year) "
            "WHERE source = 'store'"
        )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_store_native_artist_title_year")
    op.drop_index("ix_records_source", table_name="records")
    op.drop_column("records", "discogs_id_candidate")
    op.drop_column("records", "source")
