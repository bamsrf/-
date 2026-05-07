"""gift_bookings.wishlist_item_id_fkey — ON DELETE SET NULL вместо CASCADE

Модель gift_booking.py объявляет FK как ondelete="SET NULL", но в БД
сохранилось ON DELETE CASCADE от первоначальной миграции. Это значит:
при удалении wishlist_item бронь удаляется целиком, теряя историю
(статус, completed_at, gifter_email и т.п.). Должно быть SET NULL —
бронь остаётся, связь с пунктом обнуляется.

Revision ID: 20260507_gift_fk_setnull
Revises: 20260507_gift_item_nullable
Create Date: 2026-05-07
"""
from alembic import op


revision = "20260507_gift_fk_setnull"
down_revision = "20260507_gift_item_nullable"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint(
        "gift_bookings_wishlist_item_id_fkey",
        "gift_bookings",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "gift_bookings_wishlist_item_id_fkey",
        "gift_bookings",
        "wishlist_items",
        ["wishlist_item_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    # Откат на CASCADE — теоретически возможен, но в проде это поведение
    # уже фиксили как баг (PR #29). Оставляем downgrade no-op.
    pass
