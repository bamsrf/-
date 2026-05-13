"""Add follow_requests table

Revision ID: 20260512_follow_requests
Revises: 20260512_achievements
Create Date: 2026-05-12
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260512_follow_requests"
down_revision = "20260512_store_offers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    follow_request_status = postgresql.ENUM(
        "pending",
        "approved",
        "rejected",
        name="follow_request_status",
        create_type=False,
    )
    follow_request_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "follow_requests",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "requester_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "target_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "status",
            follow_request_status,
            nullable=False,
            server_default="pending",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=False),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "resolved_at",
            sa.DateTime(timezone=False),
            nullable=True,
        ),
        sa.UniqueConstraint(
            "requester_id",
            "target_id",
            name="unique_follow_request",
        ),
    )
    op.create_index(
        "ix_follow_requests_requester_id",
        "follow_requests",
        ["requester_id"],
    )
    op.create_index(
        "ix_follow_requests_target_id",
        "follow_requests",
        ["target_id"],
    )
    op.create_index(
        "ix_follow_requests_target_status",
        "follow_requests",
        ["target_id", "status"],
    )


def downgrade() -> None:
    op.drop_index("ix_follow_requests_target_status", table_name="follow_requests")
    op.drop_index("ix_follow_requests_target_id", table_name="follow_requests")
    op.drop_index("ix_follow_requests_requester_id", table_name="follow_requests")
    op.drop_table("follow_requests")
    follow_request_status = postgresql.ENUM(
        "pending",
        "approved",
        "rejected",
        name="follow_request_status",
    )
    follow_request_status.drop(op.get_bind(), checkfirst=True)
