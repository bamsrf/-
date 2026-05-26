"""
Фоновые задачи уведомлений.

emit_wishlist_in_stock_notifications:
    Раз в N минут: находит StoreListing, которые недавно стали in_stock,
    проверяет — нет ли совпадений с чьими-то WishlistItem, и эмитит
    `wishlist_in_stock` уведомления.

Логика «один record — одна живая нить» теперь работает через `upsert_notification`
и partial unique index `ix_notifications_user_dedup_unread`:
- если у юзера уже есть unread по этому record → bump (occurrences++ и stores[] += новый магазин);
- если последняя прочитана и snooze ещё активен (7д/30д/90д) → skip;
- если за окно сработало ≥DIGEST_THRESHOLD алертов одному юзеру → склеиваем в digest.

См. docs/plans/PLAN_NOTIFICATIONS_V2.md.
"""
from __future__ import annotations

import logging
from collections import defaultdict
from datetime import datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import async_session_maker
from app.models.notification import (
    Notification,
    PRIORITY_FEED,
    PRIORITY_PUSH,
    PRIORITY_QUIET,
)
from app.models.store_listing import StoreListing, ListingStatus
from app.models.wishlist import Wishlist, WishlistItem
from app.services.notification_service import (
    merge_wishlist_stores,
    upsert_notification,
)

logger = logging.getLogger(__name__)

# Окно: новые/изменённые listing'и за последние N минут (с запасом перед интервалом запуска).
RECENT_WINDOW_MINUTES = 20

# Окно «recent» для классификации первичного матча: если у юзера за это время не было
# никакого in_stock-алерта по этому record — это «первый раз», шлём push (PRIORITY_PUSH).
# Если был — повторный bump, тихий (PRIORITY_QUIET, без push).
FIRST_MATCH_LOOKBACK_DAYS = 90

# Если за один прогон одному user'у падает ≥N новых wishlist_in_stock — сворачиваем в digest.
DIGEST_THRESHOLD = 5


async def emit_wishlist_in_stock_notifications() -> None:
    """Идемпотентная фоновая задача — вызывается из APScheduler каждые 15 минут."""
    try:
        async with async_session_maker() as db:
            await _run(db)
    except Exception:
        logger.exception("emit_wishlist_in_stock_notifications failed")


async def _run(db: AsyncSession) -> None:
    now = datetime.utcnow()
    window_start = now - timedelta(minutes=RECENT_WINDOW_MINUTES)
    lookback = now - timedelta(days=FIRST_MATCH_LOOKBACK_DAYS)

    listings = (
        await db.execute(
            select(StoreListing)
            .where(
                StoreListing.status == ListingStatus.IN_STOCK,
                StoreListing.matched_record_id.is_not(None),
                StoreListing.updated_at >= window_start,
            )
            .options(
                selectinload(StoreListing.record),
                selectinload(StoreListing.store),
            )
        )
    ).scalars().all()
    if not listings:
        return

    record_ids = list({l.matched_record_id for l in listings if l.matched_record_id})
    wishlist_items = (
        await db.execute(
            select(WishlistItem)
            .join(Wishlist)
            .where(WishlistItem.record_id.in_(record_ids))
            .options(
                selectinload(WishlistItem.wishlist),
                selectinload(WishlistItem.record),
            )
        )
    ).scalars().all()
    if not wishlist_items:
        return

    # Для каждой (user, record) пары — узнать, был ли у юзера недавний in_stock алерт.
    # Это определит priority: первый раз за 90 дней = push, иначе тихий bump.
    pairs = [(wi.wishlist.user_id, wi.record_id) for wi in wishlist_items if wi.record]
    recent_alerts: set[tuple[UUID, str]] = set()
    if pairs:
        dedup_keys = [f"wishlist_in_stock:{rid}" for _, rid in pairs]
        rows = await db.execute(
            select(Notification.user_id, Notification.dedup_key).where(
                Notification.dedup_key.in_(dedup_keys),
                Notification.created_at >= lookback,
            )
        )
        for uid, dk in rows.all():
            recent_alerts.add((uid, dk))

    # Группируем listings по record для аккуратного передачи в data.stores[].
    listings_by_record: dict[str, list[StoreListing]] = defaultdict(list)
    for l in listings:
        if l.matched_record_id:
            listings_by_record[str(l.matched_record_id)].append(l)

    # Что эмитили в этот прогон — для последующей конвертации в digest.
    emitted_per_user: dict[UUID, list[Notification]] = defaultdict(list)

    for wi in wishlist_items:
        owner_id = wi.wishlist.user_id
        record = wi.record
        if not record:
            continue

        related = listings_by_record.get(str(record.id), [])
        if not related:
            continue

        prices = [l.price_rub for l in related if l.price_rub is not None]
        min_price = float(min(prices)) if prices else None
        # Берём самый дешёвый магазин как «инициатор» — у него и сюжет «появилась» интереснее.
        cheapest = min(
            (l for l in related if l.price_rub is not None),
            key=lambda x: x.price_rub,
            default=related[0],
        )
        store_payload = _build_store_payload(cheapest)

        dedup_key = f"wishlist_in_stock:{record.id}"
        is_first_match = (owner_id, dedup_key) not in recent_alerts
        priority = PRIORITY_PUSH if is_first_match else PRIORITY_QUIET

        price_str = f" от {int(min_price)}₽" if min_price is not None else ""
        try:
            notif, is_new = await upsert_notification(
                db,
                user_id=owner_id,
                type="wishlist_in_stock",
                dedup_key=dedup_key,
                entity_type="record",
                entity_id=str(record.id),
                data={
                    "record_id": str(record.id),
                    "record_title": record.title,
                    "record_artist": getattr(record, "artist", None),
                    "cover_url": getattr(record, "cover_image_url", None),
                    "price_rub": min_price,
                    "min_price_rub": min_price,
                    "store_count": 1,
                    "stores": [store_payload],
                    "store": store_payload,  # для merge_data_fn в bump-path
                },
                push_title="Снова в продаже",
                push_body=f"«{record.title}» из твоего вишлиста доступна{price_str}",
                priority=priority,
                merge_data_fn=merge_wishlist_stores,
            )
            if notif is not None and is_new:
                emitted_per_user[owner_id].append(notif)
        except Exception:
            logger.exception(
                "Failed to upsert wishlist_in_stock for user=%s record=%s",
                owner_id,
                record.id,
            )

    # Дайджест: если у юзера в одном прогоне >= DIGEST_THRESHOLD новых записей —
    # сворачиваем в digest и помечаем индивидуальные как read (они остаются в БД
    # для аналитики, но не маячат в ленте).
    for user_id, notifs in emitted_per_user.items():
        if len(notifs) < DIGEST_THRESHOLD:
            continue
        await _collapse_into_digest(db, user_id=user_id, items=notifs, when=now)

    await db.commit()
    total = sum(len(v) for v in emitted_per_user.values())
    if total:
        logger.info(
            "emit_wishlist_in_stock: emitted=%d digested_users=%d",
            total,
            sum(1 for v in emitted_per_user.values() if len(v) >= DIGEST_THRESHOLD),
        )


def _build_store_payload(listing: StoreListing) -> dict:
    """Маленький payload магазина для data.stores[]. Slug — дедуп-ключ внутри."""
    store = listing.store
    return {
        "slug": getattr(store, "slug", None),
        "name": getattr(store, "name", None),
        "price_rub": float(listing.price_rub) if listing.price_rub is not None else None,
        "url": listing.url,
        "listing_id": str(listing.id),
    }


async def _collapse_into_digest(
    db: AsyncSession,
    *,
    user_id: UUID,
    items: list[Notification],
    when: datetime,
) -> None:
    """Свернуть N индивидуальных wishlist_in_stock в один digest за день."""
    day = when.date().isoformat()
    dedup_key = f"digest:wl:{day}"

    preview = [
        {
            "record_id": (n.data or {}).get("record_id") or n.entity_id,
            "record_title": (n.data or {}).get("record_title"),
            "record_artist": (n.data or {}).get("record_artist"),
            "cover_url": (n.data or {}).get("cover_url"),
            "min_price_rub": (n.data or {}).get("min_price_rub"),
        }
        for n in items[:10]
    ]

    await upsert_notification(
        db,
        user_id=user_id,
        type="digest_wishlist_in_stock",
        dedup_key=dedup_key,
        entity_type="digest",
        entity_id=day,
        data={"count": len(items), "items": preview},
        push_title=f"{len(items)} пластинок из вишлиста снова в продаже",
        push_body="Открой ленту, чтобы посмотреть",
        priority=PRIORITY_FEED,
    )

    # Скрываем индивидуальные за этот тик: помечаем прочитанными (НЕ удаляем,
    # чтобы recent_alerts в следующем прогоне их видел и не плодил дубликаты).
    for n in items:
        if n.read_at is None:
            n.read_at = when
