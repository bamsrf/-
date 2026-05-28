"""Fix records with discogs_master_id = '0' (zero cast from dump, no real master)

Revision ID: 20260528_fix_zero_master_id
Revises: 20260528_merge_media_notif
Create Date: 2026-05-28

Root cause: backfill_records_from_dump.py used `idx.master_id::text` which
converted integer 0 (= "no master" in Discogs) to the string '0'. Any record
with discogs_master_id='0' would then match hundreds of unrelated records in
the alt-version query (all other records also tagged '0').

Fix: NULL-out all discogs_master_id='0' rows.
"""
from alembic import op


revision = "20260528_fix_zero_master_id"
down_revision = "20260528_merge_media_notif"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE records SET discogs_master_id = NULL WHERE discogs_master_id = '0'"
    )


def downgrade() -> None:
    pass
