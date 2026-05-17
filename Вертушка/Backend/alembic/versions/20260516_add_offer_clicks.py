"""add offer_clicks table for affiliate Phase A

Revision ID: 20260516_offer_clicks
Revises: 20260516_direct_messages
Create Date: 2026-05-16

Логирует каждый клик «Купить» из приложения в магазин. Используется для:
- CTR-аналитики
- subid в Admitad/EPN партнёрских ссылках → последующего матчинга с отчётами
- anti-fraud (повторные клики с одного ip_hash)

Идемпотентна по причинам, описанным в `20260516_add_direct_messages`.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260516_offer_clicks"
down_revision = "20260516_direct_messages"
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

    if not _table_exists(conn, "offer_clicks"):
        op.create_table(
            "offer_clicks",
            sa.Column(
                "id",
                postgresql.UUID(as_uuid=True),
                primary_key=True,
                server_default=sa.text("gen_random_uuid()"),
            ),
            sa.Column(
                "listing_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("store_listings.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("ip_hash", sa.String(64), nullable=True),
            sa.Column("user_agent", sa.String(500), nullable=True),
            sa.Column(
                "surface",
                sa.String(16),
                nullable=False,
                server_default=sa.text("'mobile'"),
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=False),
                nullable=False,
                server_default=sa.text("now()"),
            ),
        )
        op.create_index("ix_offer_clicks_listing_id", "offer_clicks", ["listing_id"])
        op.create_index("ix_offer_clicks_user_id", "offer_clicks", ["user_id"])
        op.create_index("ix_offer_clicks_created_at", "offer_clicks", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_offer_clicks_created_at", table_name="offer_clicks")
    op.drop_index("ix_offer_clicks_user_id", table_name="offer_clicks")
    op.drop_index("ix_offer_clicks_listing_id", table_name="offer_clicks")
    op.drop_table("offer_clicks")
