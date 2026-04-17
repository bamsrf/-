"""Add user_record_photos table

Revision ID: 20260417_user_photos
Revises: 20260417_cover_local
Create Date: 2026-04-17
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision = "20260417_user_photos"
down_revision = "20260417_cover_local"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_record_photos",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "collection_item_id",
            UUID(as_uuid=True),
            sa.ForeignKey("collection_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("photo_path", sa.String(500), nullable=False),
        sa.Column("is_primary", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_user_record_photos_user_id", "user_record_photos", ["user_id"])
    op.create_index("ix_user_record_photos_collection_item_id", "user_record_photos", ["collection_item_id"])


def downgrade() -> None:
    op.drop_index("ix_user_record_photos_collection_item_id", table_name="user_record_photos")
    op.drop_index("ix_user_record_photos_user_id", table_name="user_record_photos")
    op.drop_table("user_record_photos")
