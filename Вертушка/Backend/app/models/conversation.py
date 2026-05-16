"""
Модели личных сообщений: диалог, участник, сообщение.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    String,
    DateTime,
    Boolean,
    ForeignKey,
    UniqueConstraint,
    Index,
    CheckConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Conversation(Base):
    """Диалог 1-к-1 между двумя пользователями.

    Уникальность пары обеспечивается каноничным порядком (user_a_id < user_b_id),
    что проверяется CHECK-констрейнтом и валидируется на уровне сервиса.
    """

    __tablename__ = "conversations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    user_a_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_b_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    last_message_at: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True, index=True
    )
    last_message_preview: Mapped[str | None] = mapped_column(
        String(160), nullable=True
    )
    last_message_sender_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    __table_args__ = (
        UniqueConstraint("user_a_id", "user_b_id", name="uq_conversation_pair"),
        CheckConstraint("user_a_id < user_b_id", name="ck_conversation_canonical_order"),
    )

    participants = relationship(
        "ConversationParticipant",
        back_populates="conversation",
        cascade="all, delete-orphan",
    )
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class ConversationParticipant(Base):
    """Per-user состояние участника диалога: прочтение, мьют, архив, очистка, статус запроса."""

    __tablename__ = "conversation_participants"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    last_read_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    muted: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, server_default="false"
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cleared_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # 'accepted' | 'pending'  — для UX «Запросы»: pending уйдёт в отдельную папку (M3)
    request_status: Mapped[str] = mapped_column(
        String(16), default="accepted", nullable=False, server_default="accepted"
    )

    __table_args__ = (
        UniqueConstraint("conversation_id", "user_id", name="uq_participant"),
    )

    conversation = relationship("Conversation", back_populates="participants")


class Message(Base):
    """Одно сообщение в диалоге."""

    __tablename__ = "messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # null если deleted_at — soft tombstone
    body: Mapped[str | None] = mapped_column(String(4000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    edited_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # идемпотентность отправки при ретраях клиента
    client_nonce: Mapped[str | None] = mapped_column(
        String(64), nullable=True, index=True
    )

    __table_args__ = (
        Index("ix_messages_conv_created", "conversation_id", "created_at"),
        UniqueConstraint("sender_id", "client_nonce", name="uq_message_idempotency"),
    )

    conversation = relationship("Conversation", back_populates="messages")
