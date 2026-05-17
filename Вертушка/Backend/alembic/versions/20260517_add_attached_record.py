"""Add attached_record_id to messages

Revision ID: 20260517_attached_record
Revises: 20260517_reply_to
Create Date: 2026-05-17

Идемпотентна.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260517_attached_record"
down_revision = "20260517_reply_to"
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
    if not _column_exists(conn, "messages", "attached_record_id"):
        op.add_column(
            "messages",
            sa.Column(
                "attached_record_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("records.id", ondelete="SET NULL"),
                nullable=True,
            ),
        )


def downgrade() -> None:
    op.drop_column("messages", "attached_record_id")
