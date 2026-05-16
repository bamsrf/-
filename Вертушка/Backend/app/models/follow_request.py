"""
Запрос на подписку — для приватных профилей (is_private_profile=true).

Когда пользователь A пробует подписаться на пользователя B с приватным профилем,
вместо моментального follow создаётся `FollowRequest` со status=pending.
B может одобрить (создаётся Follow + status=approved) или отклонить (status=rejected).
A может отменить свой запрос — запись удаляется.

Хранится одна запись на пару (requester, target) — повторная подача невозможна,
повторный submit на existing pending — no-op.
"""
import enum
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class FollowRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class FollowRequest(Base):
    """Запрос на подписку на приватный профиль"""

    __tablename__ = "follow_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Кто запрашивает подписку
    requester_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Кому адресован запрос (владелец приватного профиля)
    target_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    status: Mapped[FollowRequestStatus] = mapped_column(
        Enum(
            FollowRequestStatus,
            name="follow_request_status",
            # БД-ENUM создан со значениями 'pending'|'approved'|'rejected' (см. миграцию).
            # По умолчанию SQLAlchemy сериализует Python-ENUM по имени (PENDING/APPROVED/…) —
            # ловим InvalidTextRepresentationError. values_callable заставляет использовать .value.
            values_callable=lambda enum: [e.value for e in enum],
        ),
        nullable=False,
        default=FollowRequestStatus.PENDING,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint(
            "requester_id",
            "target_id",
            name="unique_follow_request",
        ),
    )

    requester = relationship("User", foreign_keys=[requester_id])
    target = relationship("User", foreign_keys=[target_id])

    def __repr__(self) -> str:
        return f"<FollowRequest {self.requester_id} -> {self.target_id} [{self.status.value}]>"
