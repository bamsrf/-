"""
Сервис создания in-app уведомлений + отправки push.

Используется триггерами из API (follow, gift, achievement, и т.д.).
"""
from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
from app.services.push import send_push

logger = logging.getLogger(__name__)


async def create_notification(
    db: AsyncSession,
    *,
    user_id: UUID,
    type: str,
    actor_id: UUID | None = None,
    entity_type: str | None = None,
    entity_id: str | None = None,
    data: dict[str, Any] | None = None,
    push_title: str | None = None,
    push_body: str | None = None,
    flush: bool = True,
) -> Notification:
    """
    Создать запись `notifications` и (если задан push_title/body) отправить push.

    - Не падает при ошибках push — пушит best-effort.
    - Не шлёт уведомление самому себе (actor_id == user_id).
    """
    if actor_id is not None and actor_id == user_id:
        # Молча возвращаем «фейк», но в базу не пишем — действие самим на себя
        return Notification(user_id=user_id, type=type, data=data or {})

    notif = Notification(
        user_id=user_id,
        actor_id=actor_id,
        type=type,
        entity_type=entity_type,
        entity_id=entity_id,
        data=data or {},
    )
    db.add(notif)
    if flush:
        try:
            await db.flush()
        except Exception:
            logger.exception("Failed to flush Notification (type=%s user=%s)", type, user_id)
            raise

    if push_title and push_body:
        try:
            await send_push(
                db,
                user_id,
                notification_type=type,
                title=push_title,
                body=push_body,
                data={
                    "notification_id": str(notif.id),
                    "type": type,
                    "entity_type": entity_type or "",
                    "entity_id": entity_id or "",
                    **(data or {}),
                },
            )
        except Exception:
            logger.exception("Push send failed (notification_id=%s)", notif.id)

    return notif
