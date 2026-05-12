"""Add store offers infrastructure (Phase 0)

- stores
- store_listings
- pg_trgm extension + GIN-индексы на records.title/artist для fuzzy-матчинга
- BTREE-индекс на records.catalog_number

Revision ID: 20260512_store_offers
Revises: 20260512_achievements
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260512_store_offers"
down_revision = "20260512_achievements"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    op.create_table(
        "stores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(64), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("base_url", sa.String(500), nullable=False),
        sa.Column("parser_class", sa.String(128), nullable=False),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("rating", sa.Numeric(3, 2), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("requires_browser", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("last_successful_scrape_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("total_listings", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("avg_shipping_rub", sa.Numeric(10, 2), nullable=True),
        sa.Column("affiliate_program", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_stores_slug", "stores", ["slug"], unique=True)

    op.create_table(
        "store_listings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "store_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("stores.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("external_id", sa.String(255), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("title_raw", sa.Text(), nullable=False),
        sa.Column("artist_raw", sa.Text(), nullable=True),
        sa.Column("year_raw", sa.Integer(), nullable=True),
        sa.Column("format_raw", sa.String(255), nullable=True),
        sa.Column("vinyl_color_raw", sa.String(255), nullable=True),
        sa.Column("condition", sa.String(64), nullable=True),
        sa.Column("price_rub", sa.Numeric(12, 2), nullable=True),
        sa.Column("price_currency", sa.String(3), nullable=False, server_default="RUB"),
        sa.Column("status", sa.String(32), nullable=False, server_default="in_stock"),
        sa.Column("first_seen_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("now()")),
        sa.Column("last_seen_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("now()")),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "matched_record_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("records.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("match_confidence", sa.Numeric(4, 3), nullable=True),
        sa.Column("match_method", sa.String(32), nullable=True),
        sa.Column("matched_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=False), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("store_id", "external_id", name="uq_listing_store_external"),
    )
    op.create_index("ix_store_listings_store_id", "store_listings", ["store_id"])
    op.create_index("ix_store_listings_matched_record_id", "store_listings", ["matched_record_id"])
    op.create_index(
        "ix_listing_match_active",
        "store_listings",
        ["matched_record_id", "status", "last_seen_at"],
    )
    op.create_index(
        "ix_listing_unmatched_review",
        "store_listings",
        ["store_id", "matched_record_id", "first_seen_at"],
    )

    # Триграммные индексы для fuzzy-матчинга в listing_matcher.py
    op.execute(
        "CREATE INDEX IF NOT EXISTS records_title_trgm "
        "ON records USING gin (title gin_trgm_ops)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS records_artist_trgm "
        "ON records USING gin (artist gin_trgm_ops)"
    )
    op.create_index("ix_records_catalog_number", "records", ["catalog_number"])


def downgrade() -> None:
    op.drop_index("ix_records_catalog_number", table_name="records")
    op.execute("DROP INDEX IF EXISTS records_artist_trgm")
    op.execute("DROP INDEX IF EXISTS records_title_trgm")

    op.drop_index("ix_listing_unmatched_review", table_name="store_listings")
    op.drop_index("ix_listing_match_active", table_name="store_listings")
    op.drop_index("ix_store_listings_matched_record_id", table_name="store_listings")
    op.drop_index("ix_store_listings_store_id", table_name="store_listings")
    op.drop_table("store_listings")

    op.drop_index("ix_stores_slug", table_name="stores")
    op.drop_table("stores")
    # pg_trgm намеренно не удаляем — может использоваться в других местах.
