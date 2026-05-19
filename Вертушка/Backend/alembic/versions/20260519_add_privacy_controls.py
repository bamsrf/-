"""Add privacy controls: muted_until + message_hidden_for

Revision ID: 20260519_privacy
Revises: 20260519_pinned_msg
Create Date: 2026-05-19

Идемпотентна.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260519_privacy"
down_revision = "20260519_pinned_msg"
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
    if not _column_exists(conn, "conversation_participants", "muted_until"):
        op.add_column(
            "conversation_participants",
            sa.Column("muted_until", sa.DateTime, nullable=True),
        )
    if not _table_exists(conn, "message_hidden_for"):
        op.create_table(
            "message_hidden_for",
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
            sa.Column(
                "created_at", sa.DateTime, nullable=False, server_default=sa.func.now()
            ),
            sa.UniqueConstraint("message_id", "user_id", name="uq_message_hidden"),
        )
        op.create_index(
            "ix_message_hidden_for_message_id", "message_hidden_for", ["message_id"]
        )
        op.create_index(
            "ix_message_hidden_for_user_id", "message_hidden_for", ["user_id"]
        )


def downgrade() -> None:
    op.drop_index("ix_message_hidden_for_user_id", table_name="message_hidden_for")
    op.drop_index("ix_message_hidden_for_message_id", table_name="message_hidden_for")
    op.drop_table("message_hidden_for")
    op.drop_column("conversation_participants", "muted_until")
