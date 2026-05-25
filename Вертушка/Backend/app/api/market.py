"""
API раздела «Маркет» (MARKET_AND_PRICE_DRAWER.md §1.15).

Endpoints:
  GET  /api/market/stores                          — витрина магазинов с метриками
  GET  /api/market/stores/{slug}/listings          — карусель листингов магазина
  GET  /api/market/stores/{slug}/all               — пагинированная витрина магазина
  GET  /api/market/search                          — глобальный поиск по in_stock

`/api/market/new-arrivals` исторически живёт в `api/offers.py` (legacy «В наличии
сейчас» карусель в search.tsx) — оставляем как есть, новый endpoint не дублирует.

Format-mapping (для query-param `format`):
  - vinyl     → LP, 2xLP, EP, Single, 12", 7", 10", Box Set
  - cd        → CD, SACD
  - cassette  → Cassette
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.offer import (
    MarketSearchItem,
    MarketStoreInfo,
    MarketCarouselItem,
)
from app.services.cache import cache

logger = logging.getLogger(__name__)

router = APIRouter()

STALE_AFTER_DAYS = 7
NEW_TODAY_HOURS = 24

# Cache-namespace зашит с версией: при изменении формы ответа (например,
# дедупа по master_id вместо record_id) бампаем суффикс — старые ключи
# в Redis самотухнут по TTL, а свежие запросы сразу получают новую логику.
CACHE_NS_STORES = "market_stores:v2"
CACHE_NS_STORE_LISTINGS = "market_store_listings:v2"
CACHE_NS_SEARCH = "market_search:v2"
CACHE_TTL_STORES = 1800       # 30 мин — список магазинов меняется редко
CACHE_TTL_LISTINGS = 600      # 10 мин — карусели чаще обновляем
CACHE_TTL_SEARCH = 300        # 5 мин — поиск свежее


# ────────────────────────────────────────────────────────────────────────
# Format-filter — нормализованные значения формата → SQL LIKE pattern.
# Бэкап если infer_format не нормализовал — ловим самые частые написания.
# ────────────────────────────────────────────────────────────────────────


def _format_clause(fmt: Optional[str]) -> tuple[str, dict]:
    """Возвращает (SQL fragment, bind params) для фильтра формата."""
    if not fmt:
        return ("", {})
    if fmt == "vinyl":
        # LP / 2xLP / 3xLP / EP / Single / Box Set + raw 12"/7"/10"
        return (
            " AND (sl.format_raw ILIKE ANY(:vinyl_fmts) OR sl.format_raw ~ :vinyl_re)",
            {
                "vinyl_fmts": ["LP", "2xLP", "3xLP", "EP", "Single", "Box Set"],
                "vinyl_re": r'^(\d+x?LP|12"|10"|7")',
            },
        )
    if fmt == "cd":
        return (" AND sl.format_raw ILIKE ANY(:cd_fmts)", {"cd_fmts": ["CD", "2CD", "SACD"]})
    if fmt == "cassette":
        return (" AND sl.format_raw ILIKE 'cassette%'", {})
    raise HTTPException(400, f"Unknown format filter: {fmt}")


# ────────────────────────────────────────────────────────────────────────
# GET /api/market/stores — витрина магазинов
# ────────────────────────────────────────────────────────────────────────


@router.get(
    "/market/stores",
    response_model=list[MarketStoreInfo],
    summary="Витрина активных магазинов с метриками (для разделов Маркета)",
)
async def list_market_stores(
    min_in_stock: int = Query(
        1,
        ge=0,
        description=(
            "Минимум in_stock МАТЧЕННЫХ листингов с обложкой чтобы магазин "
            "показывался. По умолчанию 1 — даже только что подключённый магазин "
            "с парой матчей попадает в витрину. Карусель сама обрежется до "
            "доступных карточек."
        ),
    ),
    db: AsyncSession = Depends(get_db),
) -> list[MarketStoreInfo]:
    cache_key = f"stores:{min_in_stock}"
    cached = await cache.get(CACHE_NS_STORES, cache_key)
    if cached is not None:
        return [MarketStoreInfo.model_validate(item) for item in cached]

    cutoff = datetime.utcnow() - timedelta(days=STALE_AFTER_DAYS)
    new_cutoff = datetime.utcnow() - timedelta(hours=NEW_TODAY_HOURS)

    # in_stock_count и new_today_count согласованы с фильтрами /listings и /all:
    # листинг считается «доступным» только если он matched, имеет обложку И цену.
    # Без цены тапнуть «Купить» бессмысленно, а карусель/сетка такие пропускают —
    # шапка обязана показывать ровно столько же.
    # r.merged_into_id IS NULL — подстраховка от листингов, не перепривязанных
    # safe_merge_store_native_into (теоретически таких быть не должно, но если
    # будут — лучше не учитывать, чем выдать кривое число).
    sql = text(
        """
        SELECT
            s.slug, s.name, s.logo_url, s.rating,
            COUNT(sl.id) FILTER (
                WHERE sl.status = 'in_stock'
                  AND sl.last_seen_at >= :cutoff
                  AND sl.matched_record_id IS NOT NULL
                  AND sl.price_rub IS NOT NULL
                  AND r.merged_into_id IS NULL
                  AND COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') IS NOT NULL
            ) AS in_stock_count,
            AVG(sl.price_rub) FILTER (
                WHERE sl.status = 'in_stock'
                  AND sl.last_seen_at >= :cutoff
                  AND sl.price_rub IS NOT NULL
                  AND sl.matched_record_id IS NOT NULL
                  AND r.merged_into_id IS NULL
            ) AS avg_price_rub,
            COUNT(sl.id) FILTER (
                WHERE sl.status = 'in_stock'
                  AND sl.first_seen_at >= :new_cutoff
                  AND sl.matched_record_id IS NOT NULL
                  AND sl.price_rub IS NOT NULL
                  AND r.merged_into_id IS NULL
                  AND COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') IS NOT NULL
            ) AS new_today_count
        FROM stores s
        LEFT JOIN store_listings sl ON sl.store_id = s.id
        LEFT JOIN records r ON r.id = sl.matched_record_id
        WHERE s.is_active = true
        GROUP BY s.id
        HAVING COUNT(sl.id) FILTER (
            WHERE sl.status = 'in_stock'
              AND sl.last_seen_at >= :cutoff
              AND sl.matched_record_id IS NOT NULL
              AND sl.price_rub IS NOT NULL
              AND r.merged_into_id IS NULL
              AND COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') IS NOT NULL
        ) >= :min_in_stock
        ORDER BY s.rating DESC NULLS LAST, s.name ASC
        """
    )
    rows = (
        await db.execute(sql, {"cutoff": cutoff, "new_cutoff": new_cutoff, "min_in_stock": min_in_stock})
    ).mappings().all()

    items = [
        MarketStoreInfo(
            slug=row["slug"],
            name=row["name"],
            logo_url=row["logo_url"],
            rating=float(row["rating"] or 0),
            in_stock_count=row["in_stock_count"],
            avg_price_rub=row["avg_price_rub"],
            new_today_count=row["new_today_count"],
        )
        for row in rows
    ]

    await cache.set(
        CACHE_NS_STORES,
        cache_key,
        [it.model_dump(mode="json") for it in items],
        ttl=CACHE_TTL_STORES,
    )
    return items


# ────────────────────────────────────────────────────────────────────────
# GET /api/market/stores/{slug}/listings — горизонтальная карусель магазина
# ────────────────────────────────────────────────────────────────────────


@router.get(
    "/market/stores/{slug}/listings",
    response_model=list[MarketCarouselItem],
    summary="Карусель листингов магазина (горизонтальная витрина в Маркете)",
)
async def get_store_listings(
    slug: str,
    limit: int = Query(20, ge=1, le=50),
    sort: Literal["newest", "price_asc"] = Query("newest"),
    db: AsyncSession = Depends(get_db),
) -> list[MarketCarouselItem]:
    cache_key = f"listings:{slug}:{sort}:{limit}"
    cached = await cache.get(CACHE_NS_STORE_LISTINGS, cache_key)
    if cached is not None:
        return [MarketCarouselItem.model_validate(item) for item in cached]

    cutoff = datetime.utcnow() - timedelta(days=STALE_AFTER_DAYS)
    # Outer ORDER BY работает с колонками CTE — без `sl.` префикса.
    order_clause = (
        "first_seen_at DESC" if sort == "newest"
        else "price_rub ASC NULLS LAST"
    )

    # DISTINCT ON по дедуп-ключу: discogs_master_id если есть, иначе r.id.
    # Discogs группирует все пресс-версии (EU/US, разные цвета винила) под
    # один master_id — карусель магазина без этого показывала бы 3-4 идентичные
    # карточки RHCP «Californication 2024» (разные пресс-версии одного master).
    # Внутри master выбираем самый дешёвый листинг и отдаём конкретный record_id —
    # фронт уже на detail-экране разводит по версиям.
    # Карточка = МАТЧЕННЫЙ листинг С обложкой; без обложки в гриде дырки.
    sql = text(
        f"""
        WITH ranked AS (
            SELECT DISTINCT ON (COALESCE(r.discogs_master_id, r.id::text))
                sl.matched_record_id AS record_id,
                sl.price_rub,
                sl.first_seen_at,
                s.slug AS store_slug,
                r.discogs_id, r.artist, r.title, r.year,
                COALESCE(r.format_type, sl.format_raw) AS format_type,
                COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') AS cover_image_url
            FROM store_listings sl
            JOIN stores s ON s.id = sl.store_id
            JOIN records r ON r.id = sl.matched_record_id
            WHERE s.slug = :slug
              AND s.is_active = true
              AND sl.status = 'in_stock'
              AND sl.matched_record_id IS NOT NULL
              AND sl.price_rub IS NOT NULL
              AND sl.last_seen_at >= :cutoff
              AND r.merged_into_id IS NULL
              AND COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') IS NOT NULL
            ORDER BY COALESCE(r.discogs_master_id, r.id::text), sl.price_rub ASC NULLS LAST
        )
        SELECT * FROM ranked
        ORDER BY {order_clause}
        LIMIT :limit
        """
    )
    rows = (await db.execute(sql, {"slug": slug, "cutoff": cutoff, "limit": limit})).mappings().all()

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
        CACHE_NS_STORE_LISTINGS,
        cache_key,
        [it.model_dump(mode="json") for it in items],
        ttl=CACHE_TTL_LISTINGS,
    )
    return items


# ────────────────────────────────────────────────────────────────────────
# GET /api/market/stores/{slug}/all — полная витрина магазина (paginated)
# ────────────────────────────────────────────────────────────────────────


@router.get(
    "/market/stores/{slug}/all",
    response_model=list[MarketSearchItem],
    summary="Полная витрина магазина (/market/store/[slug] экран)",
)
async def get_store_all(
    slug: str,
    q: str | None = Query(None, description="Текстовый поиск по artist/title"),
    format: str | None = Query(None, description="vinyl | cd | cassette"),
    sort: Literal["newest", "price_asc"] = Query("price_asc"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> list[MarketSearchItem]:
    fmt_sql, fmt_params = _format_clause(format)
    cutoff = datetime.utcnow() - timedelta(days=STALE_AFTER_DAYS)

    # Outer ORDER BY ссылается на CTE-колонки — без `sl.` префикса.
    order_clause = (
        "price_rub ASC NULLS LAST" if sort == "price_asc"
        else "first_seen_at DESC"
    )

    q_clause = ""
    q_params: dict = {}
    if q:
        q_clause = " AND (r.artist ILIKE :q OR r.title ILIKE :q)"
        q_params["q"] = f"%{q}%"

    # /all — пагинированная витрина. Дедуп по master_id (см. /listings),
    # filter NULL cover — дырки портят сетку 2-колонок.
    sql = text(
        f"""
        WITH ranked AS (
            SELECT DISTINCT ON (COALESCE(r.discogs_master_id, r.id::text))
                sl.matched_record_id AS record_id,
                sl.price_rub,
                sl.first_seen_at,
                s.slug AS store_slug,
                r.discogs_id, r.artist, r.title, r.year,
                COALESCE(r.format_type, sl.format_raw) AS format_type,
                COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') AS cover_image_url
            FROM store_listings sl
            JOIN stores s ON s.id = sl.store_id
            JOIN records r ON r.id = sl.matched_record_id
            WHERE s.slug = :slug
              AND s.is_active = true
              AND sl.status = 'in_stock'
              AND sl.matched_record_id IS NOT NULL
              AND sl.price_rub IS NOT NULL
              AND sl.last_seen_at >= :cutoff
              AND r.merged_into_id IS NULL
              AND COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') IS NOT NULL
              {fmt_sql}
              {q_clause}
            ORDER BY COALESCE(r.discogs_master_id, r.id::text), sl.price_rub ASC NULLS LAST
        )
        SELECT * FROM ranked
        ORDER BY {order_clause}
        LIMIT :limit OFFSET :offset
        """
    )

    params = {
        "slug": slug, "cutoff": cutoff,
        "limit": limit, "offset": offset,
        **fmt_params, **q_params,
    }
    rows = (await db.execute(sql, params)).mappings().all()

    return [
        MarketSearchItem(
            record_id=row["record_id"],
            discogs_id=row["discogs_id"],
            artist=row["artist"],
            title=row["title"],
            year=row["year"],
            format_type=row["format_type"],
            cover_image_url=row["cover_image_url"],
            min_price_rub=row["price_rub"],
            stores_with_stock=1,  # для one-store endpoint всегда 1
            cheapest_store_slug=row["store_slug"],
            first_seen_at=row["first_seen_at"],
        )
        for row in rows
    ]


# ────────────────────────────────────────────────────────────────────────
# GET /api/market/search — глобальный поиск по in-stock-листингам всех магазинов
# ────────────────────────────────────────────────────────────────────────


@router.get(
    "/market/search",
    response_model=list[MarketSearchItem],
    summary="Поиск по in-stock листингам всех активных магазинов",
)
async def search_market(
    q: str | None = Query(None, description="Текстовый поиск по artist/title"),
    format: str | None = Query(None, description="vinyl | cd | cassette"),
    sort: Literal["price_asc", "newest"] = Query("price_asc"),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> list[MarketSearchItem]:
    """
    Дедупликация: на один record_id — одна карточка с min_price + N магазинов.
    Если у юзера пустой `q` — возвращаем последние new-arrivals (sort=newest
    или sort=price_asc по дефолту самые дешёвые сверху).
    """
    fmt_sql, fmt_params = _format_clause(format)
    cutoff = datetime.utcnow() - timedelta(days=STALE_AFTER_DAYS)

    order_clause = (
        "min_price ASC NULLS LAST" if sort == "price_asc"
        else "first_seen_at DESC"
    )

    q_clause = ""
    q_params: dict = {}
    if q and len(q.strip()) >= 2:
        q_clause = " AND (r.artist ILIKE :q OR r.title ILIKE :q)"
        q_params["q"] = f"%{q.strip()}%"

    cache_key = f"search:{q or ''}:{format or 'all'}:{sort}:{limit}"
    cached = await cache.get(CACHE_NS_SEARCH, cache_key)
    if cached is not None:
        return [MarketSearchItem.model_validate(item) for item in cached]

    # Дедуп: группируем по master_id (с fallback на r.id), чтобы разные
    # пресс-версии одного альбома не выдавались как идентичные карточки.
    # Внутри группы выбираем самый дешёвый record для отображения через
    # ARRAY_AGG ORDER BY price → [1].
    sql = text(
        f"""
        WITH agg AS (
            SELECT
                COALESCE(r.discogs_master_id, r.id::text) AS dedup_key,
                MIN(sl.price_rub) AS min_price,
                COUNT(DISTINCT sl.store_id) AS stores_with_stock,
                MAX(sl.first_seen_at) AS first_seen_at,
                (ARRAY_AGG(s.slug ORDER BY sl.price_rub ASC NULLS LAST))[1] AS cheapest_store_slug,
                (ARRAY_AGG(r.id ORDER BY sl.price_rub ASC NULLS LAST))[1] AS chosen_record_id
            FROM store_listings sl
            JOIN stores s ON s.id = sl.store_id
            JOIN records r ON r.id = sl.matched_record_id
            WHERE s.is_active = true
              AND sl.status = 'in_stock'
              AND sl.matched_record_id IS NOT NULL
              AND sl.price_rub IS NOT NULL
              AND sl.last_seen_at >= :cutoff
              AND r.merged_into_id IS NULL
              AND COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') IS NOT NULL
              {fmt_sql}
              {q_clause}
            GROUP BY COALESCE(r.discogs_master_id, r.id::text)
        )
        SELECT
            agg.chosen_record_id AS record_id, agg.min_price, agg.stores_with_stock,
            agg.first_seen_at, agg.cheapest_store_slug,
            r.discogs_id, r.artist, r.title, r.year, r.format_type, r.cover_image_url
        FROM agg
        JOIN records r ON r.id = agg.chosen_record_id
        ORDER BY {order_clause}
        LIMIT :limit
        """
    )

    params = {"cutoff": cutoff, "limit": limit, **fmt_params, **q_params}
    rows = (await db.execute(sql, params)).mappings().all()

    items = [
        MarketSearchItem(
            record_id=row["record_id"],
            discogs_id=row["discogs_id"],
            artist=row["artist"],
            title=row["title"],
            year=row["year"],
            format_type=row["format_type"],
            cover_image_url=row["cover_image_url"],
            min_price_rub=row["min_price"],
            stores_with_stock=row["stores_with_stock"],
            cheapest_store_slug=row["cheapest_store_slug"],
            first_seen_at=row["first_seen_at"],
        )
        for row in rows
    ]

    await cache.set(
        CACHE_NS_SEARCH,
        cache_key,
        [it.model_dump(mode="json") for it in items],
        ttl=CACHE_TTL_SEARCH,
    )
    return items
