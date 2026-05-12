"""
API: предложения магазинов для конкретной пластинки.

GET /api/records/{discogs_id}/offers?sort=price|rating
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.record import Record
from app.models.store import Store
from app.models.store_listing import StoreListing, ListingStatus
from app.schemas.offer import OfferResponse, StoreInfo
from app.services.affiliate import wrap_url
from app.services.cache import cache

logger = logging.getLogger(__name__)

router = APIRouter()

OFFERS_CACHE_NS = "offers"
OFFERS_CACHE_TTL = 1800  # 30 мин — синхронизировано с Mobile useCacheStore
STALE_AFTER_DAYS = 7


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
        url=wrap_url(store, listing.url),
        status=listing.status,
        last_seen_at=listing.last_seen_at,
    )


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
