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

import re

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

# Аксессуары: магазины ставят их в общий каталог рядом с пластинками
# (пины-значки, пакеты, щётки, постеры, сертификаты), а парсер по дефолту
# помечает их `LP`. В Discogs их нет — каждый on-demand fetch заведомо вернёт
# None и впустую сожжёт квоту DISCOGS_FETCH_HOURLY_LIMIT, не давая дойти до
# реальных пластинок. Этот паттерн — короткий чёрный список по title.
_ACCESSORY_TITLE_RE = re.compile(
    r"\(Pin\)|\(пин\)|\bзначок\b|пакет\b|конверт\b|щётк|щетк|"
    r"кружк|брелок|постер|poster\b|плакат|сертификат|подарочн|"
    r"футболк|t[\-\s]?shirt|худи|hoodie|наклейк|sticker",
    re.IGNORECASE,
)


def _is_accessory(listing: StoreListing) -> bool:
    return bool(_ACCESSORY_TITLE_RE.search(listing.title_raw or ""))

# Discogs on-demand: верхняя крышка против burst-нагрузки. Per-minute rate-limit
# (60 req/min) уже выровнен через discogs_limiter (TokenBucketRateLimiter capacity=55,
# refill_rate=0.95 = ~57 req/min). Hourly limit — это анти-DDOS для batch matcher'а:
# защищает от ситуации когда matcher разом хочет догнать 10к unmatched и за час
# вычерпает всю квоту, мешая live-запросам пользовательского поиска (Priority.SEARCH).
# При 500/час среднее ~8 req/min — спокойно вписывается в 60/min лимит.
DISCOGS_FETCH_HOURLY_LIMIT = 500


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
    # Берём top-N кандидатов по similarity. Используем функцию `similarity()`
    # вместо оператора `%` — asyncpg не любит `%` в подготовленных запросах
    # (`UndefinedFunctionError` даже когда оператор есть в БД).
    # На малых records-таблицах seqscan мгновенный; на больших — pg_trgm GIN
    # индекс по `gin_trgm_ops` всё равно ускоряет similarity-сортировку.
    if title:
        sql = text(
            "SELECT * FROM records "
            "WHERE similarity(title::text, cast(:q as text)) >= :thr "
            "ORDER BY similarity(title::text, cast(:q as text)) DESC "
            "LIMIT :lim"
        )
        q = title
    else:
        sql = text(
            "SELECT * FROM records "
            "WHERE similarity(artist::text, cast(:q as text)) >= :thr "
            "ORDER BY similarity(artist::text, cast(:q as text)) DESC "
            "LIMIT :lim"
        )
        q = artist  # type: ignore[assignment]
    res = await db.execute(sql, {"q": q, "lim": FUZZY_CANDIDATES_LIMIT, "thr": 0.25})
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

    # 5b) Fallback on-demand fetch by artist+title — для магазинов без barcode
    # (например, Plastinka.com публикует только название/артиста, без EAN).
    # Точность ниже чем barcode (Discogs search может вернуть похожий, но не
    # точно тот pressing), поэтому confidence 0.85 — на грани автоматического
    # acceptance. Если хочется строже — поднять FUZZY_THRESHOLD или вручную
    # модерировать через /admin/unmatched.
    if listing.artist_raw and listing.title_raw:
        rec = await _try_discogs_fetch_by_text(
            db,
            artist=listing.artist_raw,
            title=listing.title_raw,
            year=listing.year_raw,
        )
        if rec:
            _apply_match(listing, rec, Decimal("0.850"), MatchMethod.DISCOGS_FETCH)
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

        return await _save_discogs_result(db, items[0], barcode=barcode, catalog=catalog)
    except Exception:
        logger.exception("on-demand discogs fetch failed (barcode=%s catalog=%s)", barcode, catalog)
        return None


async def _try_discogs_fetch_by_text(
    db: AsyncSession, *, artist: str, title: str, year: int | None,
) -> Record | None:
    """
    Поиск Record через Discogs API по artist+title (для магазинов без barcode,
    например Plastinka.com). Соблюдает тот же hourly-counter что и barcode-fetch.
    Возвращает первый результат если matches достаточно близко по году.
    """
    from app.services.cache import cache
    counter_key = "discogs_ondemand_hits"
    counter_ns = "scraper:counters"

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
        params: dict = {
            "format": "Vinyl",
            "type": "release",
            "per_page": 5,
            "artist": artist,
            "release_title": title,
        }
        if year:
            params["year"] = year

        results = await discogs._get(
            f"{discogs.BASE_URL}/database/search",
            params=params,
            priority=Priority.ENRICHMENT,
        )
        items = results.get("results", [])
        if not items:
            return None

        # Берём первый — Discogs обычно выдаёт самый релевантный сверху.
        # Если есть год, дополнительно проверяем что найденный совпадает ±1 год
        # (Discogs иногда показывает re-issues с другим годом, нам важна суть).
        first = items[0]
        if year:
            found_year = first.get("year")
            try:
                if found_year and abs(int(found_year) - year) > 1:
                    return None
            except (ValueError, TypeError):
                pass

        return await _save_discogs_result(db, first, barcode=None, catalog=None)
    except Exception:
        logger.exception(
            "on-demand discogs fetch-by-text failed (artist=%s title=%s)", artist, title,
        )
        return None


async def _save_discogs_result(
    db: AsyncSession, first: dict, *, barcode: str | None, catalog: str | None,
) -> Record | None:
    """Общий хелпер: из Discogs search-результата создаёт Record (если ещё нет)."""
    discogs_id = str(first.get("id"))
    existing = await _find_by_discogs_id(db, discogs_id)
    if existing:
        return existing

    title = first.get("title", "")
    artist, _, album = title.partition(" - ")
    # Discogs search возвращает `format` как массив строк типа
    # ["Vinyl", "LP", "Album"] или ["CD", "Album", "Reissue"]. Берём первое
    # значимое имя (LP/CD/Cassette/Box Set) — этого хватает для отображения
    # в карусели. Без этого records.format_type был NULL у всех созданных
    # через on-demand fetch.
    fmt_arr = first.get("format") or []
    format_type = next(
        (f for f in fmt_arr if f and f.strip() not in ("Album", "Reissue", "Compilation")),
        fmt_arr[0] if fmt_arr else None,
    )
    rec = Record(
        discogs_id=discogs_id,
        title=album.strip() or title.strip(),
        artist=artist.strip() or "Unknown",
        year=int(first["year"]) if first.get("year") and str(first["year"]).isdigit() else None,
        barcode=barcode,
        catalog_number=(first.get("catno") or catalog),
        label=(first.get("label") or [None])[0],
        format_type=format_type,
        cover_image_url=first.get("cover_image"),
        thumb_image_url=first.get("thumb"),
        country=first.get("country"),
    )
    db.add(rec)
    await db.flush()
    return rec


# ---- Batch-матчер для cron --------------------------------------------- #


async def match_unmatched_batch(batch_size: int = 200) -> dict[str, int]:
    """Найти `batch_size` unmatched листингов и попытаться сматчить.

    Возвращает счётчики: matched/unmatched/errors + диагностика по сигналам
    (какие из источников ID у листингов вообще есть).
    """
    counters = {"processed": 0, "matched": 0, "unmatched": 0, "errors": 0, "skipped_accessory": 0}
    # Диагностика: сколько unmatched листингов вообще имеют сигналы для матчинга.
    # Без неё непонятно, парсер ли не вытаскивает barcode/discogs_url, или
    # matcher не находит. Лог помогает увидеть это сразу в выводе батча.
    signals = {"with_discogs_url": 0, "with_barcode": 0, "with_catalog": 0, "no_ids": 0}
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
            if _is_accessory(listing):
                counters["skipped_accessory"] += 1
                counters["unmatched"] += 1
                continue
            raw = listing.raw_payload or {}
            has_url = bool(raw.get("discogs_release_url"))
            has_bc = bool(raw.get("barcode"))
            has_cat = bool(raw.get("catalog_number"))
            if has_url:
                signals["with_discogs_url"] += 1
            if has_bc:
                signals["with_barcode"] += 1
            if has_cat:
                signals["with_catalog"] += 1
            if not (has_url or has_bc or has_cat):
                signals["no_ids"] += 1

            # SAVEPOINT — если match_listing уронит транзакцию, откатываем
            # только этот savepoint, остальные листинги продолжаем матчить.
            sp = await db.begin_nested()
            try:
                ok = await match_listing(listing, db)
                await sp.commit()
                counters["matched" if ok else "unmatched"] += 1
            except Exception:
                await sp.rollback()
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

    logger.info("match batch: %s | signals: %s", counters, signals)
    return counters
