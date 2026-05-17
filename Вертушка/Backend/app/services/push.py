"""
Отправка push-уведомлений через Expo Push API.
"""
from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Маппинг типа Notification → имя флага User.notify_*
PUSH_PREFERENCE_FIELD = {
    "follow_request": "notify_follow_request",
    "new_follower": "notify_new_follower",
    "gift_booked": "notify_gift_booked",
    "gift_confirmed": "notify_gift_booked",
    "wishlist_in_stock": "notify_wishlist_in_stock",
    "wishlist_price_drop": "notify_wishlist_in_stock",
    "achievement_unlocked": "notify_achievement",
}


def _looks_like_expo_token(token: str | None) -> bool:
    if not token:
        return False
    return token.startswith("ExponentPushToken[") or token.startswith("ExpoPushToken[")


async def send_push(
    db: AsyncSession,
    user_id: UUID,
    *,
    notification_type: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> bool:
    """Отправить push конкретному пользователю с учётом его настроек."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user or not user.is_active or user.deleted_at is not None:
        return False

    pref_field = PUSH_PREFERENCE_FIELD.get(notification_type)
    if pref_field and not getattr(user, pref_field, True):
        return False

    token = user.push_token
    if not _looks_like_expo_token(token):
        return False

    message = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
        "data": data or {},
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            r = await client.post(
                EXPO_PUSH_URL,
                json=message,
                headers={
                    "Accept": "application/json",
                    "Accept-Encoding": "gzip, deflate",
                    "Content-Type": "application/json",
                },
            )
        if r.status_code >= 400:
            logger.warning("Expo push HTTP %s: %s", r.status_code, r.text[:200])
            return False
        payload = r.json()
        ticket = (payload or {}).get("data")
        if isinstance(ticket, dict) and ticket.get("status") == "error":
            details = ticket.get("details") or {}
            error_code = details.get("error")
            if error_code in ("DeviceNotRegistered", "InvalidCredentials"):
                logger.info("Push token invalid (%s) for user %s — clearing", error_code, user_id)
                user.push_token = None
                await db.commit()
            else:
                logger.warning("Expo push ticket error: %s", ticket)
            return False
        return True
    except Exception as exc:
        logger.warning("Push send failed for user %s: %s", user_id, exc)
        return False
