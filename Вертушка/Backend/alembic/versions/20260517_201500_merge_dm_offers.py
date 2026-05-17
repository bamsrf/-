"""merge heads: attached_record + merge_pinned_offers

Revision ID: 20260517_merge_dm_offers
Revises: 20260517_attached_record, 20260517_merge_pinned_offers
Create Date: 2026-05-17 20:15:00

Параллельно с моим первым merge (pinned_at + merge_offers_folders) юзер
добавил ещё две DM-миграции (reply_to, attached_record). Этот merge —
пустая мостовая, только объединяет линию для alembic upgrade head.
"""
from typing import Sequence, Union

revision: str = "20260517_merge_dm_offers"
down_revision: Union[str, tuple, None] = ("20260517_attached_record", "20260517_merge_pinned_offers")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
