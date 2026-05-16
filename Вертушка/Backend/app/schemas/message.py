"""
Pydantic-схемы для личных сообщений.
"""
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


RequestStatus = Literal["accepted", "pending"]
MessageFolder = Literal["primary", "requests"]


class ConversationPartner(BaseModel):
    """Собеседник в карточке диалога."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    display_name: str | None = None
    avatar_url: str | None = None


class MessageRead(BaseModel):
    """Одно сообщение для отдачи на клиент."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    sender_id: UUID
    body: str | None = None
    created_at: datetime
    edited_at: datetime | None = None
    deleted_at: datetime | None = None
    client_nonce: str | None = None


class ConversationRead(BaseModel):
    """Карточка диалога в инбоксе."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    partner: ConversationPartner
    last_message_preview: str | None = None
    last_message_at: datetime | None = None
    last_message_sender_id: UUID | None = None
    unread_count: int = 0
    muted: bool = False
    request_status: RequestStatus = "accepted"
    is_blocked: bool = False


class ConversationDetail(BaseModel):
    """Детали диалога + первая страница сообщений."""
    conversation: ConversationRead
    messages: list[MessageRead]


class ConversationCreate(BaseModel):
    """Запрос на создание/получение диалога с пользователем."""
    recipient_user_id: UUID


class MessageCreate(BaseModel):
    """Новое сообщение в диалоге."""
    body: str = Field(..., min_length=1, max_length=4000)
    client_nonce: str | None = Field(None, max_length=64)


class ReadMarker(BaseModel):
    """Пометить прочитанными до этого сообщения включительно."""
    up_to_message_id: UUID


class UnreadCount(BaseModel):
    """Счётчики непрочитанного для бейджа в табе."""
    primary: int
    requests: int
