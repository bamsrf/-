"""
Модель блок-листа: запрещённые email/IP для бронирования подарков.
Управляется только SQL-доступом (нет API-ручек на чтение/запись).
"""
import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import String, DateTime, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class BlockedContactKind(str, Enum):
    EMAIL = "email"
    IP = "ip"


class BlockedContact(Base):
    """Заблокированные контакты (email или IP)."""

    __tablename__ = "blocked_contacts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    kind: Mapped[BlockedContactKind] = mapped_column(
        SQLEnum(BlockedContactKind, name="blocked_contact_kind"),
        nullable=False,
        index=True,
    )
    value: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        index=True,
    )
    reason: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    blocked_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )
    blocked_by_admin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    def __repr__(self) -> str:
        return f"<BlockedContact {self.kind}:{self.value}>"
