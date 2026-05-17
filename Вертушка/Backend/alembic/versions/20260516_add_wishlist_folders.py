"""Add wishlist folders (tag-based M2M between WishlistFolder and WishlistItem)

Revision ID: 20260516_wishlist_folders
Revises: 20260516_direct_messages
Create Date: 2026-05-16
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260516_wishlist_folders"
down_revision = "20260516_direct_messages"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "wishlist_folders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "wishlist_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wishlists.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column(
            "sort_order",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_wishlist_folders_wishlist_id",
        "wishlist_folders",
        ["wishlist_id"],
    )

    op.create_table(
        "wishlist_folder_items",
        sa.Column(
            "wishlist_folder_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wishlist_folders.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "wishlist_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("wishlist_items.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "added_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index(
        "ix_wfi_folder",
        "wishlist_folder_items",
        ["wishlist_folder_id"],
    )
    op.create_index(
        "ix_wfi_item",
        "wishlist_folder_items",
        ["wishlist_item_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_wfi_item", table_name="wishlist_folder_items")
    op.drop_index("ix_wfi_folder", table_name="wishlist_folder_items")
    op.drop_table("wishlist_folder_items")
    op.drop_index(
        "ix_wishlist_folders_wishlist_id", table_name="wishlist_folders"
    )
    op.drop_table("wishlist_folders")
