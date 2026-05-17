"""Add pinned_at to conversation_participants

Revision ID: 20260517_pinned_at
Revises: 20260516_direct_messages
Create Date: 2026-05-17

Идемпотентна: добавляет колонку только если её нет.
"""
from alembic import op
import sqlalchemy as sa


revision = "20260517_pinned_at"
down_revision = "20260516_direct_messages"
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
    if not _column_exists(conn, "conversation_participants", "pinned_at"):
        op.add_column(
            "conversation_participants",
            sa.Column("pinned_at", sa.DateTime(timezone=False), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("conversation_participants", "pinned_at")
