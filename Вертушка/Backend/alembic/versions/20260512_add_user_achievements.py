"""Add user_achievements table (Phase 0)

Revision ID: 20260512_achievements
Revises: 20260507_gift_fk_setnull
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260512_achievements"
down_revision = "20260507_gift_fk_setnull"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_achievements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("is_unlocked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("unlocked_at", sa.DateTime(timezone=False), nullable=True),
        sa.Column("progress", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("progress_target", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("ach_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.UniqueConstraint("user_id", "code", name="uq_user_achievement"),
    )
    op.create_index(
        "ix_user_achievements_user_unlocked",
        "user_achievements",
        ["user_id", "is_unlocked"],
    )
    op.create_index("ix_user_achievements_code", "user_achievements", ["code"])


def downgrade() -> None:
    op.drop_index("ix_user_achievements_code", table_name="user_achievements")
    op.drop_index("ix_user_achievements_user_unlocked", table_name="user_achievements")
    op.drop_table("user_achievements")
