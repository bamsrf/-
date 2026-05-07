"""gift_bookings.wishlist_item_id — DROP NOT NULL

Модель уже описывает колонку как nullable=True, но в БД ограничение NOT NULL
осталось от первоначальной миграции. cancel_booking / complete_gift_booking
пытаются установить wishlist_item_id = NULL → IntegrityError → 500.

Миграция идемпотентна: на dev/тестовых БД снимет constraint; на проде, где
он уже снят руками, ALTER COLUMN ... DROP NOT NULL — no-op (Postgres не
выдаст ошибку, если ограничение уже отсутствует).

Revision ID: 20260507_gift_item_nullable
Revises: 20260505_analytics
Create Date: 2026-05-07
"""
from alembic import op


revision = "20260507_gift_item_nullable"
down_revision = "20260505_analytics"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "gift_bookings",
        "wishlist_item_id",
        nullable=True,
    )


def downgrade() -> None:
    # NOT NULL обратно ставить нельзя: в проде уже есть строки с NULL
    # (отменённые/завершённые брони). Downgrade оставляем no-op.
    pass
