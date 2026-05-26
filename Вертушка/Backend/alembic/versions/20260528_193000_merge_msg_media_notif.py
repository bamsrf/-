"""merge heads: msg_media + notif_v2

Revision ID: 20260528_merge_media_notif
Revises: 20260528_msg_media, 20260525_notif_v2
Create Date: 2026-05-28 19:30:00

20260525_notif_v2 и 20260526_dedup_idx обе разветвились от 20260525_merge.
Сводим в один head, чтобы alembic upgrade head работал.
"""
from typing import Sequence, Union


revision: str = "20260528_merge_media_notif"
down_revision: Union[str, tuple, None] = ("20260528_msg_media", "20260525_notif_v2")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
