"""merge heads: reply_to + merge_pinned_offers

Revision ID: 20260517_merge_dm_offers
Revises: 20260517_reply_to, 20260517_merge_pinned_offers
Create Date: 2026-05-17 20:15:00

Параллельно с моим первым merge (pinned_at + merge_offers_folders) юзер
закоммитил reply_to-миграцию (поверх pinned_at). attached_record у него
тоже есть локально но ещё не закоммичен — поэтому в git и на проде head
заканчивается на reply_to. Merge — пустая мостовая, объединяет линии.
"""
from typing import Sequence, Union

revision: str = "20260517_merge_dm_offers"
down_revision: Union[str, tuple, None] = ("20260517_reply_to", "20260517_merge_pinned_offers")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
