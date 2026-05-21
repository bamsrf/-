"""
Фоновые задачи парсинга магазинов винила.

Регистрируются в main.py через APScheduler, под env SCRAPERS_ENABLED=true.
Все задачи идемпотентны и не валят друг друга при ошибке отдельного магазина.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.exc import SQLAlchemyError

from app.database import async_session_maker
from app.models.store import Store
from app.models.store_listing import StoreListing, ListingStatus
from app.services.scrapers.runner import crawl_store
from app.services.scrapers.shops import *  # noqa: F401,F403  — auto-register parsers
from app.services.listing_matcher import match_unmatched_batch, rematch_store_native_batch
from app.api.offers import invalidate_record_offers

logger = logging.getLogger(__name__)


# ---- Полный обход (раскидан по дням недели для не перегрузки сети) ---- #


async def _crawl_active_stores(filter_browser: bool | None = None, mode: str = "full") -> dict:
    """Прогнать все активные магазины. filter_browser: True/False/None — фильтр."""
    counters = {"stores": 0, "ok": 0, "failed": 0, "total_upserted": 0}
    async with async_session_maker() as db:
        stmt = select(Store).where(Store.is_active.is_(True))
        if filter_browser is not None:
            stmt = stmt.where(Store.requires_browser.is_(filter_browser))
        stores = list((await db.execute(stmt)).scalars().all())

    counters["stores"] = len(stores)
    for store in stores:
        try:
            res = await crawl_store(store.slug, mode=mode)
            counters["ok"] += 1
            counters["total_upserted"] += res.get("upserted", 0)
        except Exception:
            counters["failed"] += 1
            logger.exception("crawl_store failed for %s", store.slug)

    logger.info("scraper batch done: %s", counters)
    return counters


async def daily_full_crawl_http() -> dict:
    """Каждый день — полный обход магазинов БЕЗ requires_browser.

    Если магазинов > 20 — лучше разбить на группы, но для старта проще одной задачей.
    """
    return await _crawl_active_stores(filter_browser=False, mode="full")


async def weekly_full_crawl_browser() -> dict:
    """Раз в неделю — магазины с requires_browser=True (тяжелее, реже)."""
    return await _crawl_active_stores(filter_browser=True, mode="full")


async def daily_incremental_crawl() -> dict:
    """Ежедневно — инкрементальный обход (для магазинов с поддержкой)."""
    return await _crawl_active_stores(filter_browser=False, mode="incremental")


# ---- Stock-refresh для активных матчей --------------------------------- #


async def stock_refresh_active(per_store_limit: int = 100) -> dict:
    """Обновить stock+цены листингов, привязанных к Record и показанных юзерам.

    Берёт листинги с last_seen_at > 6h, проходит per-store через crawl_full
    но с ограниченным лимитом — это упрощённо. Для production-grade лучше
    отдельный «refresh by URL» режим — но пока MVP.
    """
    cutoff = datetime.utcnow() - timedelta(hours=6)
    counters = {"stores": 0, "stale_count": 0}
    async with async_session_maker() as db:
        # Считаем сколько устаревших матчей
        stale_q = await db.execute(
            select(StoreListing.id)
            .where(StoreListing.matched_record_id.is_not(None))
            .where(StoreListing.status == ListingStatus.IN_STOCK)
            .where(StoreListing.last_seen_at < cutoff)
            .limit(1)
        )
        if stale_q.first() is None:
            return counters
        counters["stale_count"] = 1

        stores_q = await db.execute(
            select(Store).where(Store.is_active.is_(True), Store.requires_browser.is_(False))
        )
        stores = list(stores_q.scalars().all())

    counters["stores"] = len(stores)
    for store in stores:
        try:
            await crawl_store(store.slug, mode="full", limit=per_store_limit)
        except Exception:
            logger.exception("stock_refresh failed for %s", store.slug)
    return counters


# ---- Матчинг unmatched ------------------------------------------------- #


async def hourly_match_unmatched() -> dict:
    """Раз в час — матчим до 200 unmatched листингов."""
    return await match_unmatched_batch(batch_size=200)


async def weekly_rematch_store_native() -> dict:
    """Раз в неделю — store-native записи прогоняются через Discogs search.

    Если за прошедшую неделю релиз появился на Discogs, в records.discogs_id_candidate
    запишется кандидат для будущего merge tool (Phase 2). Авто-merge не делаем —
    нужен ручной review, чтобы не порвать collection/wishlist FK.
    """
    return await rematch_store_native_batch(batch_size=200)


# ---- Чистка stale ------------------------------------------------------ #


async def weekly_cleanup_stale(days: int = 30) -> dict:
    """Помечаем как 'removed' листинги, которые не видели больше N дней."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    async with async_session_maker() as db:
        try:
            res = await db.execute(
                update(StoreListing)
                .where(StoreListing.last_seen_at < cutoff)
                .where(StoreListing.status != ListingStatus.REMOVED)
                .values(status=ListingStatus.REMOVED, updated_at=datetime.utcnow())
            )
            await db.commit()
            return {"updated": res.rowcount or 0}
        except SQLAlchemyError:
            await db.rollback()
            logger.exception("cleanup_stale failed")
            return {"updated": 0, "error": True}


# ---- Прогрев кэша offers ---------------------------------------------- #


async def invalidate_offers_for_recently_updated(window_minutes: int = 60) -> dict:
    """После обхода парсеров — сбросить offers-кэш для записей, чьи листинги
    обновились в последний час. Чтобы юзеры видели свежие цены, не дожидаясь TTL.
    """
    since = datetime.utcnow() - timedelta(minutes=window_minutes)
    async with async_session_maker() as db:
        from app.models.record import Record
        res = await db.execute(
            select(Record.discogs_id)
            .join(StoreListing, StoreListing.matched_record_id == Record.id)
            .where(StoreListing.last_seen_at >= since)
            .where(Record.discogs_id.is_not(None))
            .distinct()
        )
        ids = [r[0] for r in res.fetchall() if r[0]]

    for did in ids:
        await invalidate_record_offers(did)
    return {"invalidated": len(ids)}
