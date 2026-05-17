"""Add direct messages tables (conversations, participants, messages, user_blocks) + notify_messages

Revision ID: 20260516_direct_messages
Revises: 20260512_follow_requests
Create Date: 2026-05-16

Идемпотентна: каждый `create_table`/`add_column` обёрнут проверкой через
`information_schema`. На чистой БД создаёт всё; на полусобранной — достраивает
недостающее, не падая на «already exists». Нужно для прод-окружения, где
часть DDL применялась нештатно (таблицы созданы, но `alembic_version`
остался на старой ревизии и `users.notify_messages` не доехал).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260516_direct_messages"
down_revision = "20260512_follow_requests"
branch_labels = None
depends_on = None


def _table_exists(conn, name: str) -> bool:
    return bool(conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :name)"
        ),
        {"name": name},
    ).scalar())


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

    # users.notify_messages
    if not _column_exists(conn, "users", "notify_messages"):
        op.add_column(
            "users",
            sa.Column(
                "notify_messages",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("true"),
            ),
        )

    # conversations
    if not _table_exists(conn, "conversations"):
        op.create_table(
            "conversations",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "user_a_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "user_b_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=False),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.Column("last_message_at", sa.DateTime(timezone=False), nullable=True),
            sa.Column("last_message_preview", sa.String(length=160), nullable=True),
            sa.Column(
                "last_message_sender_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.UniqueConstraint("user_a_id", "user_b_id", name="uq_conversation_pair"),
            sa.CheckConstraint("user_a_id < user_b_id", name="ck_conversation_canonical_order"),
        )
        op.create_index("ix_conversations_user_a_id", "conversations", ["user_a_id"])
        op.create_index("ix_conversations_user_b_id", "conversations", ["user_b_id"])
        op.create_index("ix_conversations_last_message_at", "conversations", ["last_message_at"])

    # conversation_participants
    if not _table_exists(conn, "conversation_participants"):
        op.create_table(
            "conversation_participants",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "conversation_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("conversations.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "joined_at",
                sa.DateTime(timezone=False),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.Column("last_read_at", sa.DateTime(timezone=False), nullable=True),
            sa.Column(
                "muted",
                sa.Boolean(),
                nullable=False,
                server_default=sa.text("false"),
            ),
            sa.Column("archived_at", sa.DateTime(timezone=False), nullable=True),
            sa.Column("cleared_at", sa.DateTime(timezone=False), nullable=True),
            sa.Column(
                "request_status",
                sa.String(length=16),
                nullable=False,
                server_default="accepted",
            ),
            sa.UniqueConstraint("conversation_id", "user_id", name="uq_participant"),
        )
        op.create_index(
            "ix_conversation_participants_conversation_id",
            "conversation_participants",
            ["conversation_id"],
        )
        op.create_index(
            "ix_conversation_participants_user_id",
            "conversation_participants",
            ["user_id"],
        )

    # messages
    if not _table_exists(conn, "messages"):
        op.create_table(
            "messages",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "conversation_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("conversations.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "sender_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column("body", sa.String(length=4000), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=False),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.Column("edited_at", sa.DateTime(timezone=False), nullable=True),
            sa.Column("deleted_at", sa.DateTime(timezone=False), nullable=True),
            sa.Column("client_nonce", sa.String(length=64), nullable=True),
            sa.UniqueConstraint("sender_id", "client_nonce", name="uq_message_idempotency"),
        )
        op.create_index("ix_messages_conversation_id", "messages", ["conversation_id"])
        op.create_index("ix_messages_sender_id", "messages", ["sender_id"])
        op.create_index("ix_messages_client_nonce", "messages", ["client_nonce"])
        op.create_index(
            "ix_messages_conv_created", "messages", ["conversation_id", "created_at"]
        )

    # user_blocks
    if not _table_exists(conn, "user_blocks"):
        op.create_table(
            "user_blocks",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "blocker_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "blocked_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
            ),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=False),
                nullable=False,
                server_default=sa.text("now()"),
            ),
            sa.UniqueConstraint("blocker_id", "blocked_id", name="uq_user_block"),
        )
        op.create_index("ix_user_blocks_blocker_id", "user_blocks", ["blocker_id"])
        op.create_index("ix_user_blocks_blocked_id", "user_blocks", ["blocked_id"])


def downgrade() -> None:
    op.drop_index("ix_user_blocks_blocked_id", table_name="user_blocks")
    op.drop_index("ix_user_blocks_blocker_id", table_name="user_blocks")
    op.drop_table("user_blocks")

    op.drop_index("ix_messages_conv_created", table_name="messages")
    op.drop_index("ix_messages_client_nonce", table_name="messages")
    op.drop_index("ix_messages_sender_id", table_name="messages")
    op.drop_index("ix_messages_conversation_id", table_name="messages")
    op.drop_table("messages")

    op.drop_index(
        "ix_conversation_participants_user_id", table_name="conversation_participants"
    )
    op.drop_index(
        "ix_conversation_participants_conversation_id",
        table_name="conversation_participants",
    )
    op.drop_table("conversation_participants")

    op.drop_index("ix_conversations_last_message_at", table_name="conversations")
    op.drop_index("ix_conversations_user_b_id", table_name="conversations")
    op.drop_index("ix_conversations_user_a_id", table_name="conversations")
    op.drop_table("conversations")

    op.drop_column("users", "notify_messages")
