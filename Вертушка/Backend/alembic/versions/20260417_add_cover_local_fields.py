"""Add cover_local_path and cover_cached_at to records

Revision ID: 20260417_cover_local
Revises: 20260320_notif
Create Date: 2026-04-17
"""
from alembic import op
import sqlalchemy as sa


revision = "20260417_cover_local"
down_revision = "20260320_notif"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("records", sa.Column("cover_local_path", sa.String(500), nullable=True))
    op.add_column("records", sa.Column("cover_cached_at", sa.DateTime, nullable=True))


def downgrade() -> None:
    op.drop_column("records", "cover_cached_at")
    op.drop_column("records", "cover_local_path")
