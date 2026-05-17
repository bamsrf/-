"""merge heads: pinned_at + offers_folders

Revision ID: 20260517_merge_pinned_offers
Revises: 20260517_pinned_at, 20260517_merge_offers_folders
Create Date: 2026-05-17 19:30:00

После моих фиксов (rate_limiter, korobkavinyla, AutoRail layout) деплой упал
на multiple heads — параллельно с моими scraping-миграциями появилась
20260517_pinned_at от другой feature-ветки. Этот merge — пустая мостовая
миграция, она ничего не меняет в схеме, только объединяет линию.
"""
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = "20260517_merge_pinned_offers"
down_revision: Union[str, tuple, None] = ("20260517_pinned_at", "20260517_merge_offers_folders")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
