"""Add anti-fraud and verification fields to gift_bookings

Revision ID: 20260504_gift_antifraud
Revises: 20260504_reveal_gifter
Create Date: 2026-05-04
"""
from alembic import op
import sqlalchemy as sa


revision = "20260504_gift_antifraud"
down_revision = "20260504_reveal_gifter"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "gift_bookings",
        sa.Column("gifter_ip", sa.String(length=45), nullable=True),
    )
    op.add_column(
        "gift_bookings",
        sa.Column("gifter_user_agent_hash", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "gift_bookings",
        sa.Column("verify_token", sa.String(length=50), nullable=True),
    )
    op.create_index(
        "ix_gift_bookings_gifter_ip",
        "gift_bookings",
        ["gifter_ip"],
    )
    op.create_index(
        "ix_gift_bookings_verify_token",
        "gift_bookings",
        ["verify_token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_gift_bookings_verify_token", table_name="gift_bookings")
    op.drop_index("ix_gift_bookings_gifter_ip", table_name="gift_bookings")
    op.drop_column("gift_bookings", "verify_token")
    op.drop_column("gift_bookings", "gifter_user_agent_hash")
    op.drop_column("gift_bookings", "gifter_ip")
