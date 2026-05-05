"""Add wishlists.reveal_gifter_to_owner flag

Revision ID: 20260504_reveal_gifter
Revises: 20260504_waitlist
Create Date: 2026-05-04
"""
from alembic import op
import sqlalchemy as sa


revision = "20260504_reveal_gifter"
down_revision = "20260504_waitlist"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "wishlists",
        sa.Column(
            "reveal_gifter_to_owner",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("wishlists", "reveal_gifter_to_owner")
