"""merge heads: attached_record + merge_dm_offers (финальный)

Revision ID: 20260517_merge_final
Revises: 20260517_attached_record, 20260517_merge_dm_offers
Create Date: 2026-05-17 20:35:00

reply_to разветвился на attached_record (DM-ветка) и merge_dm_offers (мой
merge). Финальный merge сводит обе ветки в один head.
"""
from typing import Sequence, Union

revision: str = "20260517_merge_final"
down_revision: Union[str, tuple, None] = ("20260517_attached_record", "20260517_merge_dm_offers")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
