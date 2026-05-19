"""Add message_reactions table

Revision ID: 20260519_reactions
Revises: 20260517_merge_final
Create Date: 2026-05-19

Идемпотентна.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260519_reactions"
down_revision = "20260517_merge_final"
branch_labels = None
depends_on = None


def _table_exists(conn, table: str) -> bool:
    return bool(conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :table)"
        ),
        {"table": table},
    ).scalar())


def upgrade() -> None:
    conn = op.get_bind()
    if _table_exists(conn, "message_reactions"):
        return
    op.create_table(
        "message_reactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "message_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("messages.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("emoji", sa.String(length=16), nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("message_id", "user_id", "emoji", name="uq_reaction"),
    )
    op.create_index("ix_reactions_message", "message_reactions", ["message_id"])
    op.create_index("ix_message_reactions_user_id", "message_reactions", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_message_reactions_user_id", table_name="message_reactions")
    op.drop_index("ix_reactions_message", table_name="message_reactions")
    op.drop_table("message_reactions")
