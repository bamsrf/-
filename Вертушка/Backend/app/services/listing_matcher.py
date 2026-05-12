"""
Матчинг листингов магазинов с записями (Record).

Стратегия — каскад фолбэков с разными confidence:
  1. discogs_release_url (raw_payload) → точное совпадение по Record.discogs_id  → 1.0
  2. barcode → Record.barcode                                                     → 1.0
  3. catalog_number → Record.catalog_number (нормализованный)                     → 0.9
  4. fuzzy(artist + title + year) через pg_trgm + rapidfuzz                       → score
  5. on-demand fetch через Discogs (если есть barcode/catalog но Record нет)      → 0.95

Пишет: matched_record_id, match_confidence, match_method, matched_at.
Не падает на единичных ошибках — собирает счётчики, логирует.
"""
from __future__ import annotations

import logging
from datetime import datetime
from decimal import Decimal
from typing import Iterable

from rapidfuzz import fuzz
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker
from app.models.record import Record
from app.models.store_listing import StoreListing, MatchMethod
from app.services.scrapers.extractors import (
    normalize_barcode,
    normalize_catalog,
)

logger = logging.getLogger(__name__)


FUZZY_THRESHOLD = 0.85
FUZZY_CANDIDATES_LIMIT = 50

# Discogs on-demand: жёсткий лимит, чтобы не задудосить Discogs API
DISCOGS_FETCH_HOURLY_LIMIT = 50


# ---- Поиск Record по идентификаторам ----------------------------------- #


async def _find_by_discogs_id(db: AsyncSession, discogs_id: str) -> Record | None:
    res = await db.execute(select(Record).where(Record.discogs_id == discogs_id))
    return res.scalar_one_or_none()


async def _find_by_barcode(db: AsyncSession, barcode: str) -> Record | None:
    res = await db.execute(select(Record).where(Record.barcode == barcode))
    return res.scalar_one_or_none()


async def _find_by_catalog(db: AsyncSession, catalog_norm: str) -> Record | None:
    """Catalog в БД не нормализован — нормализуем на лету через regexp_replace."""
    res = await db.execute(
        text(
            "SELECT * FROM records "
            "WHERE upper(regexp_replace(catalog_number, '[ \\-_/.]', '', 'g')) = :cat "
            "LIMIT 1"
        ),
        {"cat": catalog_norm},
    )
    row = res.fetchone()
    if not row:
        return None
    rec = await db.execute(select(Record).where(Record.id == row.id))
    return rec.scalar_one_or_none()


async def _fuzzy_candidates(
    db: AsyncSession, artist: str | None, title: str | None
) -> list[Record]:
    """Кандидаты через pg_trgm. Если нет ни artist, ни title — пусто."""
    if not artist and not title:
        return []
    # Берём по top-N кандидатам по similarity на title (если есть) либо artist
    if title:
        sql = text(
            "SELECT * FROM records "
            "WHERE title %% :q "
            "ORDER BY similarity(title, :q) DESC "
            "LIMIT :lim"
        )
        q = title
    else:
        sql = text(
            "SELECT * FROM records "
            "WHERE artist %% :q "
            "ORDER BY similarity(artist, :q) DESC "
            "LIMIT :lim"
        )
        q = artist  # type: ignore[assignment]
    res = await db.execute(sql, {"q": q, "lim": FUZZY_CANDIDATES_LIMIT})
    ids = [row.id for row in res.fetchall()]
    if not ids:
        return []
    res2 = await db.execute(select(Record).where(Record.id.in_(ids)))
    return list(res2.scalars().all())


def _fuzzy_score(rec: Record, listing: StoreListing) -> float:
    title_score = fuzz.token_sort_ratio(rec.title or "", listing.title_raw or "") / 100.0
    artist_score = (
        fuzz.token_sort_ratio(rec.artist or "", listing.artist_raw or "") / 100.0
        if listing.artist_raw else 0.5
    )
    year_bonus = 0.1 if (rec.year and listing.year_raw and rec.year == listing.year_raw) else 0.0
    return min(1.0, title_score * 0.6 + artist_score * 0.3 + year_bonus)


# ---- Главная функция матчинга ------------------------------------------ #


async def match_listing(listing: StoreListing, db: AsyncSession) -> bool:
    """Попытаться привязать листинг к Record. Возвращает True если матч найден.

    Не делает commit — вызывающий должен закоммитить.
    """
    raw = listing.raw_payload or {}

    # 1) Discogs URL
    discogs_url = raw.get("discogs_release_url")
    if discogs_url:
        # парсим release/<id>
        import re
        m = re.search(r"/release/(\d+)", discogs_url)
        if m:
            rec = await _find_by_discogs_id(db, m.group(1))
            if rec:
                _apply_match(listing, rec, Decimal("1.000"), MatchMethod.DISCOGS_URL)
                return True

    # 2) Barcode
    barcode_raw = raw.get("barcode") or listing.raw_payload.get("barcode") if listing.raw_payload else None
    barcode = normalize_barcode(barcode_raw)
    if barcode:
        rec = await _find_by_barcode(db, barcode)
        if rec:
            _apply_match(listing, rec, Decimal("1.000"), MatchMethod.BARCODE)
            return True

    # 3) Catalog
    catalog = normalize_catalog(raw.get("catalog_number"))
    if catalog:
        rec = await _find_by_catalog(db, catalog)
        if rec:
            _apply_match(listing, rec, Decimal("0.900"), MatchMethod.CATALOG)
            return True

    # 4) Fuzzy
    candidates = await _fuzzy_candidates(db, listing.artist_raw, listing.title_raw)
    if candidates:
        best, best_score = None, 0.0
        for rec in candidates:
            score = _fuzzy_score(rec, listing)
            if score > best_score:
                best, best_score = rec, score
        if best and best_score >= FUZZY_THRESHOLD:
            _apply_match(listing, best, Decimal(str(round(best_score, 3))), MatchMethod.FUZZY)
            return True

    # 5) On-demand Discogs fetch — отдельная задача (не блокируем матчер)
    if barcode or catalog:
        rec = await _try_discogs_fetch(db, barcode=barcode, catalog=catalog)
        if rec:
            _apply_match(listing, rec, Decimal("0.950"), MatchMethod.DISCOGS_FETCH)
            return True

    return False


def _apply_match(listing: StoreListing, rec: Record, conf: Decimal, method: str) -> None:
    listing.matched_record_id = rec.id
    listing.match_confidence = conf
    listing.match_method = method
    listing.matched_at = datetime.utcnow()


# ---- On-demand Discogs fetch ------------------------------------------- #


async def _try_discogs_fetch(
    db: AsyncSession, *, barcode: str | None, catalog: str | None
) -> Record | None:
    """Если у нас нет Record в БД, но есть barcode/catalog — попытаться найти на Discogs.

    Соблюдает hourly-лимит (Redis-counter), низкий приоритет.
    Создаёт Record в БД при успехе.
    """
    from app.services.cache import cache
    counter_key = "discogs_ondemand_hits"
    counter_ns = "scraper:counters"

    # Атомарный INCR через Redis (graceful fallback)
    if cache.available:
        try:
            assert cache._pool is not None
            redis_key = cache._key(counter_ns, counter_key)
            count = await cache._pool.incr(redis_key)
            if count == 1:
                await cache._pool.expire(redis_key, 3600)
            if count > DISCOGS_FETCH_HOURLY_LIMIT:
                return None
        except Exception:
            logger.debug("on-demand counter failed", exc_info=True)

    try:
        from app.services.discogs import DiscogsService
        from app.services.rate_limiter import Priority

        discogs = DiscogsService()
        params: dict = {"format": "Vinyl", "type": "release", "per_page": 5}
        if barcode:
            params["barcode"] = barcode
        elif catalog:
            params["catno"] = catalog

        results = await discogs._get(
            f"{discogs.BASE_URL}/database/search",
            params=params,
            priority=Priority.ENRICHMENT,
        )
        items = results.get("results", [])
        if not items:
            return None

        first = items[0]
        discogs_id = str(first.get("id"))
        # Если Record уже существует — вернём
        existing = await _find_by_discogs_id(db, discogs_id)
        if existing:
            return existing

        # Создаём минимальную запись (полное обогащение прилетит из api/records.py)
        title = first.get("title", "")
        artist, _, album = title.partition(" - ")
        rec = Record(
            discogs_id=discogs_id,
            title=album.strip() or title.strip(),
            artist=artist.strip() or "Unknown",
            year=int(first["year"]) if first.get("year") and str(first["year"]).isdigit() else None,
            barcode=barcode,
            catalog_number=(first.get("catno") or catalog),
            label=(first.get("label") or [None])[0],
            cover_image_url=first.get("cover_image"),
            thumb_image_url=first.get("thumb"),
            country=first.get("country"),
        )
        db.add(rec)
        await db.flush()
        return rec
    except Exception:
        logger.exception("on-demand discogs fetch failed (barcode=%s catalog=%s)", barcode, catalog)
        return None


# ---- Batch-матчер для cron --------------------------------------------- #


async def match_unmatched_batch(batch_size: int = 200) -> dict[str, int]:
    """Найти `batch_size` unmatched листингов и попытаться сматчить.

    Возвращает счётчики: matched/unmatched/errors.
    """
    counters = {"processed": 0, "matched": 0, "unmatched": 0, "errors": 0}
    async with async_session_maker() as db:
        res = await db.execute(
            select(StoreListing)
            .where(StoreListing.matched_record_id.is_(None))
            .where(StoreListing.status.in_(("in_stock", "preorder")))
            .order_by(StoreListing.first_seen_at.asc())
            .limit(batch_size)
        )
        listings = list(res.scalars().all())

        for listing in listings:
            counters["processed"] += 1
            try:
                ok = await match_listing(listing, db)
                counters["matched" if ok else "unmatched"] += 1
            except Exception:
                counters["errors"] += 1
                logger.exception("match failed for listing %s", listing.id)
                continue

        try:
            await db.commit()
        except Exception:
            await db.rollback()
            counters["errors"] += counters["matched"]
            counters["matched"] = 0
            logger.exception("commit failed in match_unmatched_batch")

    logger.info("match batch: %s", counters)
    return counters
