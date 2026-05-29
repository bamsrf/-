"""Add stores.is_trusted (WS3.2 — trusted-store immediate store-native)

Revision ID: 20260528_store_is_trusted
Revises: 20260528_cover_coverage
Create Date: 2026-05-28
"""
import sqlalchemy as sa
from alembic import op


revision = "20260528_store_is_trusted"
down_revision = "20260528_cover_coverage"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "stores",
        sa.Column(
            "is_trusted",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )


def downgrade() -> None:
    op.drop_column("stores", "is_trusted")
