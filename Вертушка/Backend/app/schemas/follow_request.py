"""
Схемы для запросов на подписку (приватные профили).
"""
from datetime import datetime
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict


FollowRequestStatusLiteral = Literal["pending", "approved", "rejected"]


class FollowRequestUser(BaseModel):
    """Пользователь в карточке запроса (короткое представление)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    username: str
    display_name: str | None = None
    avatar_url: str | None = None


class FollowRequestResponse(BaseModel):
    """Карточка запроса на подписку — для списков (входящие/исходящие)."""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    requester: FollowRequestUser
    target: FollowRequestUser
    status: FollowRequestStatusLiteral
    created_at: datetime
    resolved_at: datetime | None = None


class FollowActionResponse(BaseModel):
    """
    Универсальный ответ POST /users/{id}/follow.

    Для публичных профилей: status='followed' (создан Follow).
    Для приватных профилей: status='requested' (создан FollowRequest pending)
    или 'already_requested' / 'already_following'.
    """
    status: Literal[
        "followed",
        "requested",
        "already_following",
        "already_requested",
    ]
    follow_request_id: UUID | None = None
