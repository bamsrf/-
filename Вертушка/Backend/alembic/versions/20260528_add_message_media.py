"""Add media_url + media_type to messages

Revision ID: 20260528_msg_media
Revises: 20260527_dump_idx
Create Date: 2026-05-28

Поддержка вложений (фото/медиа) в личных сообщениях.
Идемпотентна.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260528_msg_media"
down_revision = "20260527_dump_idx"
branch_labels = None
depends_on = None


def _column_exists(conn, table: str, column: str) -> bool:
    return bool(conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = :table "
            "AND column_name = :column)"
        ),
        {"table": table, "column": column},
    ).scalar())


def upgrade() -> None:
    conn = op.get_bind()
    if not _column_exists(conn, "messages", "media_url"):
        op.add_column(
            "messages",
            sa.Column("media_url", sa.String(length=512), nullable=True),
        )
    if not _column_exists(conn, "messages", "media_type"):
        op.add_column(
            "messages",
            sa.Column("media_type", sa.String(length=32), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("messages", "media_type")
    op.drop_column("messages", "media_url")
