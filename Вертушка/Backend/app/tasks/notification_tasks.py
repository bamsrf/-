"""
Фоновые задачи уведомлений.

emit_wishlist_in_stock_notifications:
    Раз в N минут: находит StoreListing, которые недавно стали in_stock,
    проверяет — нет ли совпадений с чьими-то WishlistItem, и эмитит
    `wishlist_in_stock` уведомления. С дедупликацией за 24 часа.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.database import async_session_maker
from app.models.notification import Notification
from app.models.store_listing import StoreListing, ListingStatus
from app.models.wishlist import Wishlist, WishlistItem

logger = logging.getLogger(__name__)

# Окно: новые listing'и за последние N минут (с запасом перед интервалом запуска).
RECENT_WINDOW_MINUTES = 20
# Не отправляем повторный wishlist_in_stock тому же user за этот record чаще, чем раз в N часов.
DEDUP_HOURS = 24


async def emit_wishlist_in_stock_notifications() -> None:
    """Идемпотентная фоновая задача — вызывается из APScheduler."""
    try:
        async with async_session_maker() as db:
            await _run(db)
    except Exception:
        logger.exception("emit_wishlist_in_stock_notifications failed")


async def _run(db) -> None:
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=RECENT_WINDOW_MINUTES)
    dedup_since = now - timedelta(hours=DEDUP_HOURS)

    # Свежие in-stock listings с matched записью
    q = (
        select(StoreListing)
        .where(
            StoreListing.status == ListingStatus.IN_STOCK,
            StoreListing.matched_record_id.is_not(None),
            StoreListing.updated_at >= window_start,
        )
        .options(selectinload(StoreListing.record))
    )
    listings = (await db.execute(q)).scalars().all()
    if not listings:
        return

    record_ids = list({l.matched_record_id for l in listings if l.matched_record_id})

    # Все wishlist_items по этим record_ids → их владельцы
    wi_rows = await db.execute(
        select(WishlistItem)
        .join(Wishlist)
        .where(WishlistItem.record_id.in_(record_ids))
        .options(selectinload(WishlistItem.wishlist))
        .options(selectinload(WishlistItem.record))
    )
    wishlist_items = wi_rows.scalars().all()
    if not wishlist_items:
        return

    # Дедуп: уже отправленные за DEDUP_HOURS notification'ы
    already_rows = await db.execute(
        select(Notification.user_id, Notification.entity_id).where(
            Notification.type == "wishlist_in_stock",
            Notification.created_at >= dedup_since,
        )
    )
    already = {(uid, eid) for uid, eid in already_rows.all()}

    from app.services.notification_service import create_notification

    emitted = 0
    for wi in wishlist_items:
        owner_id = wi.wishlist.user_id
        record = wi.record
        if not record:
            continue
        key = (owner_id, str(record.id))
        if key in already:
            continue

        # Цена для текста: минимальная по match'ам этой пластинки в окне
        related = [l for l in listings if l.matched_record_id == record.id]
        min_price = None
        for l in related:
            if l.price_rub is None:
                continue
            if min_price is None or l.price_rub < min_price:
                min_price = l.price_rub
        price_str = f" от {int(min_price)}₽" if min_price is not None else ""

        try:
            await create_notification(
                db,
                user_id=owner_id,
                type="wishlist_in_stock",
                entity_type="record",
                entity_id=str(record.id),
                data={
                    "record_id": str(record.id),
                    "record_title": record.title,
                    "record_artist": getattr(record, "artist", None),
                    "cover_url": getattr(record, "cover_image_url", None),
                    "price_rub": float(min_price) if min_price is not None else None,
                },
                push_title="Снова в продаже",
                push_body=f"«{record.title}» из твоего вишлиста доступна{price_str}",
            )
            emitted += 1
        except Exception:
            logger.exception("Failed to emit wishlist_in_stock for user=%s record=%s", owner_id, record.id)

    if emitted:
        await db.commit()
        logger.info("emit_wishlist_in_stock: emitted=%d", emitted)
