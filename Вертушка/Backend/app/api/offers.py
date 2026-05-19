"""
API: предложения магазинов для конкретной пластинки.

GET  /api/records/{discogs_id}/offers?sort=price|rating
POST /api/offers/{listing_id}/click                  ← фаза A affiliate (см. SHOPS_PARSING.md §affiliate)
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select, text
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user_optional
from app.config import get_settings
from app.database import get_db
from app.models.offer_click import OfferClick
from app.models.record import Record
from app.models.store import Store
from app.models.store_listing import StoreListing, ListingStatus
from app.models.user import User
from app.schemas.offer import MarketCarouselItem, OfferClickResponse, OfferResponse, StoreInfo
from app.services.affiliate import wrap_url
from app.services.cache import cache

logger = logging.getLogger(__name__)

router = APIRouter()

OFFERS_CACHE_NS = "offers"
OFFERS_CACHE_TTL = 1800  # 30 мин — синхронизировано с Mobile useCacheStore
STALE_AFTER_DAYS = 7

MARKET_CACHE_NS = "market"
MARKET_CACHE_TTL = 900  # 15 мин — карусель не критична к мгновенному обновлению


@router.get(
    "/records/{discogs_id}/offers",
    response_model=list[OfferResponse],
    summary="Предложения магазинов для записи",
)
async def get_record_offers(
    discogs_id: str,
    sort: Literal["price", "rating"] = Query("price"),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[OfferResponse]:
    cache_key = f"{discogs_id}:{sort}:{limit}"
    cached = await cache.get(OFFERS_CACHE_NS, cache_key)
    if cached is not None:
        return [OfferResponse.model_validate(item) for item in cached]

    rec_res = await db.execute(select(Record.id).where(Record.discogs_id == discogs_id))
    record_id = rec_res.scalar_one_or_none()
    if record_id is None:
        return []

    cutoff = datetime.utcnow() - timedelta(days=STALE_AFTER_DAYS)

    stmt = (
        select(StoreListing)
        .options(joinedload(StoreListing.store))
        .where(StoreListing.matched_record_id == record_id)
        .where(StoreListing.status.in_((ListingStatus.IN_STOCK, ListingStatus.PREORDER)))
        .where(StoreListing.last_seen_at >= cutoff)
    )
    if sort == "price":
        stmt = stmt.order_by(StoreListing.price_rub.asc().nulls_last())
    else:
        stmt = stmt.order_by(Store.rating.desc()).join(Store, Store.id == StoreListing.store_id)
    stmt = stmt.limit(limit)

    res = await db.execute(stmt)
    listings = list(res.unique().scalars().all())

    offers = [_to_response(li) for li in listings if li.store and li.store.is_active]

    await cache.set(
        OFFERS_CACHE_NS,
        cache_key,
        [o.model_dump(mode="json") for o in offers],
        ttl=OFFERS_CACHE_TTL,
    )
    return offers


def _to_response(listing: StoreListing) -> OfferResponse:
    """Preview-URL для GET /offers — без subid (он создаётся при клике)."""
    store = listing.store
    return OfferResponse(
        listing_id=listing.id,
        store=StoreInfo(
            slug=store.slug,
            name=store.name,
            logo_url=store.logo_url,
            rating=float(store.rating or 0),
        ),
        price_rub=listing.price_rub,
        condition=listing.condition,
        vinyl_color=listing.vinyl_color_raw,
        format=listing.format_raw,
        # Preview-URL: только UTM, без affiliate-subid. Полный wrapped URL с
        # subid Mobile получит из POST /offers/{id}/click.
        url=wrap_url(store, listing.url),
        status=listing.status,
        last_seen_at=listing.last_seen_at,
    )


# ============================================================================
# Affiliate Phase A — клик-трекинг и финальный wrapped URL
# ============================================================================


@router.post(
    "/offers/{listing_id}/click",
    response_model=OfferClickResponse,
    status_code=status.HTTP_200_OK,
    summary="Записать клик «Купить» и получить финальный URL для перехода",
)
async def track_offer_click(
    listing_id: UUID,
    request: Request,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> OfferClickResponse:
    """
    Mobile/Web вызывают этот эндпоинт ПЕРЕД открытием URL магазина.
    Эндпоинт:
        1. Создаёт запись OfferClick с ip_hash + user_agent + (опц.) user_id
        2. Использует click.id как `subid` для аффилиат-обёртки
        3. Возвращает финальный URL → клиент делает Linking.openURL(url)

    Идемпотентность: каждый клик = новая строка (это нужно для отчётов).
    Anti-fraud делается отдельно (rate-limit / DB-аналитика), не здесь.
    """
    stmt = (
        select(StoreListing)
        .options(joinedload(StoreListing.store))
        .where(StoreListing.id == listing_id)
    )
    listing = (await db.execute(stmt)).unique().scalar_one_or_none()
    if listing is None or listing.store is None or not listing.store.is_active:
        raise HTTPException(status_code=404, detail="Listing not found or store inactive")

    click = OfferClick(
        listing_id=listing.id,
        user_id=current_user.id if current_user else None,
        ip_hash=_hash_ip(request),
        user_agent=(request.headers.get("user-agent") or "")[:500] or None,
        surface="mobile",
    )
    db.add(click)
    await db.flush()  # получаем click.id для subid
    final_url = wrap_url(
        listing.store,
        listing.url,
        subid=str(click.id),
        user_id=str(current_user.id) if current_user else None,
    )
    await db.commit()

    return OfferClickResponse(click_id=click.id, url=final_url)


# ============================================================================
# Market carousel (OFFERS_UX.md Фича 4 — «В наличии сейчас» на search.tsx)
# ============================================================================


@router.get(
    "/market/new-arrivals",
    response_model=list[MarketCarouselItem],
    summary="Свежие предложения магазинов для карусели в поиске",
)
async def get_market_new_arrivals(
    limit: int = Query(24, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> list[MarketCarouselItem]:
    """
    Возвращает последние N листингов со статусом in_stock из всех активных магазинов.

    Дедуп по `matched_record_id`: на одну запись отдаём только самый дешёвый листинг
    из всех магазинов. Сортировка — по дате появления листинга в БД (новинки в продаже
    сверху). Это даёт «N разных пластинок» в карусели, а не «N дублей одной обложки».

    Кэш — Redis, TTL 15 минут. Инвалидируется при `parse_listing` через
    `invalidate_market_feed` (по аналогии с `invalidate_record_offers`).
    """
    cache_key = f"new_arrivals:{limit}"
    cached = await cache.get(MARKET_CACHE_NS, cache_key)
    if cached is not None:
        return [MarketCarouselItem.model_validate(item) for item in cached]

    cutoff = datetime.utcnow() - timedelta(days=STALE_AFTER_DAYS)

    # Сначала находим минимальную цену на каждую matched запись — это
    # дешевле, чем тянуть все листинги и группировать в Python.
    # DISTINCT ON по matched_record_id + ORDER BY price даёт нам по
    # одному (самому дешёвому) листингу на запись.
    sql = text(
        """
        WITH ranked AS (
            SELECT DISTINCT ON (sl.matched_record_id)
                sl.matched_record_id AS record_id,
                sl.price_rub,
                sl.first_seen_at,
                s.slug AS store_slug,
                r.discogs_id,
                r.artist,
                r.title,
                r.year,
                -- Формат: приоритет у records.format_type (богаче, из Discogs),
                -- fallback на sl.format_raw (что определил парсер магазина).
                -- Без fallback почти все карточки приходили с NULL format_type
                -- т.к. Discogs API search не возвращает формат в search-результате,
                -- а matcher._save_discogs_result создаёт Record без format_type.
                COALESCE(r.format_type, sl.format_raw) AS format_type,
                r.cover_image_url
            FROM store_listings sl
            JOIN stores s ON s.id = sl.store_id
            JOIN records r ON r.id = sl.matched_record_id
            WHERE sl.status = 'in_stock'
              AND sl.matched_record_id IS NOT NULL
              AND sl.price_rub IS NOT NULL
              AND sl.last_seen_at >= :cutoff
              AND s.is_active = true
            ORDER BY sl.matched_record_id, sl.price_rub ASC NULLS LAST
        )
        SELECT *
        FROM ranked
        ORDER BY first_seen_at DESC
        LIMIT :limit
        """
    )
    rows = (await db.execute(sql, {"cutoff": cutoff, "limit": limit})).mappings().all()

    items = [
        MarketCarouselItem(
            record_id=row["record_id"],
            discogs_id=row["discogs_id"],
            artist=row["artist"],
            title=row["title"],
            year=row["year"],
            format_type=row["format_type"],
            cover_image_url=row["cover_image_url"],
            min_price_rub=row["price_rub"],
            store_slug=row["store_slug"],
            first_seen_at=row["first_seen_at"],
        )
        for row in rows
    ]

    await cache.set(
        MARKET_CACHE_NS,
        cache_key,
        [item.model_dump(mode="json") for item in items],
        ttl=MARKET_CACHE_TTL,
    )
    return items


async def invalidate_market_feed() -> None:
    """Хелпер для scraper_tasks: сбросить кэш карусели после новых листингов."""
    if not cache.available:
        return
    try:
        assert cache._pool is not None
        prefix = cache._key(MARKET_CACHE_NS, "new_arrivals:")
        async for key in cache._pool.scan_iter(match=f"{prefix}*"):
            await cache._pool.delete(key)
    except Exception:
        logger.debug("invalidate market cache failed", exc_info=True)


def _hash_ip(request: Request) -> str | None:
    """sha256(ip + SECRET_KEY) — для anti-fraud аналитики без хранения PII."""
    # Уважаем X-Forwarded-For (за nginx). Берём первый адрес из цепочки.
    fwd = request.headers.get("x-forwarded-for") or ""
    ip = fwd.split(",")[0].strip() if fwd else (request.client.host if request.client else "")
    if not ip:
        return None
    secret = get_settings().secret_key
    return hashlib.sha256(f"{ip}|{secret}".encode("utf-8")).hexdigest()


async def invalidate_record_offers(discogs_id: str) -> None:
    """Хелпер для scraper_tasks: сбросить кэш всех вариантов sort/limit для записи."""
    if not cache.available:
        return
    try:
        assert cache._pool is not None
        prefix = cache._key(OFFERS_CACHE_NS, f"{discogs_id}:")
        # SCAN по префиксу
        async for key in cache._pool.scan_iter(match=f"{prefix}*"):
            await cache._pool.delete(key)
    except Exception:
        logger.debug("invalidate offers cache failed for %s", discogs_id, exc_info=True)
