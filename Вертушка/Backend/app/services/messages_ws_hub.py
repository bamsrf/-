"""
In-memory WebSocket hub для DM.

Подключения держатся в dict {user_id: [WebSocket, ...]}. Когда сервис messaging
шлёт push_event(user_id, event), мы рассылаем JSON во все активные сокеты этого
пользователя. Один воркер uvicorn — соединения in-memory; при росте — заменим
на Redis pub/sub.

Typing: на клиента приходит событие 'typing' от собеседника (сервер ретрансилит
команду одного юзера всем другим участникам).
"""
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)

# user_id (str) → set of active WebSocket
_hub: dict[str, set[WebSocket]] = {}


async def register(user_id: str, ws: WebSocket) -> None:
    _hub.setdefault(user_id, set()).add(ws)


async def unregister(user_id: str, ws: WebSocket) -> None:
    conns = _hub.get(user_id)
    if not conns:
        return
    conns.discard(ws)
    if not conns:
        _hub.pop(user_id, None)


def has_active(user_id: str) -> bool:
    return bool(_hub.get(user_id))


async def push_event(user_id: Any, event: dict) -> None:
    """Отправить JSON-событие всем активным сокетам пользователя."""
    key = str(user_id)
    conns = list(_hub.get(key, set()))
    for ws in conns:
        try:
            await ws.send_json(event)
        except Exception:
            # Соединение оборвалось — выкидываем из hub
            await unregister(key, ws)
