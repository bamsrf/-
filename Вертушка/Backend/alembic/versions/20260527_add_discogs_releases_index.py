"""Add discogs_releases_index for bulk matcher lookup

Revision ID: 20260527_dump_idx
Revises: 20260526_dedup_idx
Create Date: 2026-05-27

Slim-схема для индекса Discogs Releases Dump (~16M записей). Хранит ТОЛЬКО
поля, нужные matcher'у для поиска совпадений по barcode/catalog/artist+title.
Полный tracklist + другие поля Record догружаются лениво через
_ensure_record_discogs_payload при первом детальном просмотре.

Объём (оценка): ~16M × 200 байт = ~3.2 GB heap.
+ индексы: ~3 GB GIN trigram на artist/title, ~300 MB остальные.
ИТОГО: ~7 GB в БД.

Индексы СОЗДАЁТ НЕ МИГРАЦИЯ, а ingest_discogs_dump.py после COPY (через
CREATE INDEX CONCURRENTLY). Иначе COPY был бы в 5-10× медленнее.

Идемпотентна.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260527_dump_idx"
down_revision = "20260526_dedup_idx"
branch_labels = None
depends_on = None


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

    if not _table_exists(conn, "discogs_releases_index"):
        op.create_table(
            "discogs_releases_index",
            sa.Column("discogs_id", sa.BigInteger, primary_key=True),
            sa.Column("master_id", sa.BigInteger, nullable=True),

            sa.Column("artist", sa.Text, nullable=False),
            sa.Column("title", sa.Text, nullable=False),
            sa.Column("year", sa.SmallInteger, nullable=True),
            sa.Column("country", sa.Text, nullable=True),
            sa.Column("format_type", sa.Text, nullable=True),
            sa.Column("label", sa.Text, nullable=True),

            # Нормализованные поля для exact-match.
            # barcode: digits only (regexp_replace при ingest).
            # catalog: uppercase, no spaces/dashes/dots.
            sa.Column("barcode_norm", sa.Text, nullable=True),
            sa.Column("catalog_norm", sa.Text, nullable=True),

            # cover_image_url из <images type="primary">/<image uri150> —
            # hot-link, для отображения и для _ensure_cover_cached если
            # юзер откроет деталь.
            sa.Column("cover_image_url", sa.Text, nullable=True),

            # Версия дампа — дата (без времени). Помогает мониторить старость
            # индекса и решать когда переингестить.
            sa.Column("dump_version", sa.Date, nullable=False),

            sa.Column(
                "created_at", sa.DateTime,
                nullable=False, server_default=sa.text("now()"),
            ),
        )


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS discogs_releases_index CASCADE")
