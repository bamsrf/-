"""Add pinned_message_id to conversations

Revision ID: 20260519_pinned_msg
Revises: 20260519_reactions
Create Date: 2026-05-19

Идемпотентна.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260519_pinned_msg"
down_revision = "20260519_reactions"
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
    if not _column_exists(conn, "conversations", "pinned_message_id"):
        op.add_column(
            "conversations",
            sa.Column(
                "pinned_message_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("messages.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )


def downgrade() -> None:
    op.drop_column("conversations", "pinned_message_id")
