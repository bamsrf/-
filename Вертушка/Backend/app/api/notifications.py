"""
API персональных уведомлений и социальной ленты.
"""
import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.auth import get_current_user
from app.database import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import (
    MarkReadResponse,
    NotificationActor,
    NotificationListResponse,
    NotificationResponse,
    SocialFeedItem,
    SocialFeedResponse,
    UnreadCountResponse,
)
from app.services.feed import get_social_feed

logger = logging.getLogger(__name__)

router = APIRouter()


def _serialize(n: Notification) -> NotificationResponse:
    actor: NotificationActor | None = None
    if n.actor is not None:
        actor = NotificationActor(
            id=n.actor.id,
            username=n.actor.username,
            display_name=n.actor.display_name,
            avatar_url=n.actor.avatar_url,
        )
    return NotificationResponse(
        id=n.id,
        type=n.type,
        entity_type=n.entity_type,
        entity_id=n.entity_id,
        data=n.data or {},
        created_at=n.created_at,
        read_at=n.read_at,
        actor=actor,
    )


@router.get("/", response_model=NotificationListResponse)
async def list_personal(
    cursor: str | None = Query(None, description="ISO timestamp последнего полученного item"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Личная лента уведомлений (вкладка «Ты»)."""
    q = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .options(selectinload(Notification.actor))
        .order_by(Notification.created_at.desc())
        .limit(limit)
    )
    if cursor:
        try:
            cutoff = datetime.fromisoformat(cursor)
            q = q.where(Notification.created_at < cutoff)
        except ValueError:
            pass

    rows = (await db.execute(q)).scalars().all()
    unread = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
    )

    next_cursor = rows[-1].created_at.isoformat() if len(rows) == limit else None

    return NotificationListResponse(
        items=[_serialize(n) for n in rows],
        unread_count=int(unread or 0),
        next_cursor=next_cursor,
    )


@router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Сколько непрочитанных personal-уведомлений."""
    cnt = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
    )
    return UnreadCountResponse(unread_count=int(cnt or 0))


@router.post("/read-all", response_model=MarkReadResponse)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отметить все personal-уведомления прочитанными."""
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
        .values(read_at=datetime.utcnow())
    )
    await db.commit()
    return MarkReadResponse(unread_count=0)


@router.post("/{notification_id}/read", response_model=MarkReadResponse)
async def mark_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Отметить одно уведомление прочитанным."""
    n = await db.scalar(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if n.read_at is None:
        n.read_at = datetime.utcnow()
        await db.commit()
    cnt = await db.scalar(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.read_at.is_(None),
        )
    )
    return MarkReadResponse(unread_count=int(cnt or 0))


@router.get("/social", response_model=SocialFeedResponse)
async def social_feed(
    cursor: str | None = Query(None, description="ISO timestamp последнего полученного item"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Лента подписок (вкладка «Подписки»). Генерируется on-the-fly, без записи в БД."""
    raw_items, next_cursor = await get_social_feed(
        db,
        user_id=current_user.id,
        limit=limit,
        cursor_iso=cursor,
    )
    return SocialFeedResponse(
        items=[SocialFeedItem(**it) for it in raw_items],
        next_cursor=next_cursor,
    )
