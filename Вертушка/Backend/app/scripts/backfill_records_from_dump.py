"""
Backfill `records` из локального discogs-дампа (`discogs_releases_index`).

Делает 2 фазы:
  1. SQL UPDATE: проставляет missing-поля Record (year, country, format_type,
     label, discogs_master_id, cover_image_url) из дампа. COALESCE — не
     перетирает существующие значения.
  2. Bulk-mirror обложек: для всех Record с cover_image_url, но без
     cover_local_path — скачивает в covers/{discogs_id}.jpg через
     CoverStorageService. Concurrency через semaphore, прогресс в лог.

Usage:
    docker exec vertushka_api python -m app.scripts.backfill_records_from_dump
        [--no-mirror]   # пропустить cover-mirror
        [--no-update]   # пропустить SQL UPDATE
        [--concurrency 10]
        [--limit 0]     # ограничить кол-во mirror'нутых (0=все)
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import time
from typing import Sequence

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker, engine
from app.services.cover_storage import CoverStorageService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("backfill")


_UPDATE_SQL = text(
    """
    UPDATE records r
    SET
      year              = COALESCE(r.year, idx.year),
      country           = COALESCE(NULLIF(r.country, ''),     idx.country),
      format_type       = COALESCE(NULLIF(r.format_type, ''), idx.format_type),
      label             = COALESCE(NULLIF(r.label, ''),       idx.label),
      discogs_master_id = COALESCE(NULLIF(r.discogs_master_id, ''), NULLIF(idx.master_id, 0)::text),
      cover_image_url   = COALESCE(NULLIF(r.cover_image_url, ''),   idx.cover_image_url),
      updated_at        = NOW()
    FROM discogs_releases_index idx
    WHERE r.discogs_id ~ '^[0-9]+$'
      AND r.source = 'discogs'
      AND r.merged_into_id IS NULL
      AND r.discogs_id::bigint = idx.discogs_id
    """
)


async def run_sql_backfill() -> None:
    """Phase 1 — single UPDATE по join с indexed PK (быстро)."""
    started = time.monotonic()
    async with engine.begin() as conn:
        result = await conn.execute(_UPDATE_SQL)
        affected = result.rowcount
    logger.info(
        "SQL backfill done: %d rows updated in %.2fs",
        affected, time.monotonic() - started,
    )


async def _fetch_mirror_targets(db: AsyncSession, limit: int) -> Sequence[tuple]:
    """Возвращает [(discogs_id, cover_image_url), ...] для записей,
    у которых есть URL обложки, но cover_local_path пустой."""
    q = text(
        """
        SELECT discogs_id, cover_image_url
        FROM records
        WHERE source = 'discogs'
          AND merged_into_id IS NULL
          AND cover_local_path IS NULL
          AND cover_image_url IS NOT NULL
          AND cover_image_url <> ''
          AND discogs_id IS NOT NULL
        ORDER BY updated_at DESC
        """
    )
    if limit > 0:
        q = text(str(q) + f" LIMIT {limit}")
    res = await db.execute(q)
    return res.all()


async def _mirror_one(
    semaphore: asyncio.Semaphore,
    service: CoverStorageService,
    discogs_id: str,
    image_url: str,
    counters: dict,
) -> None:
    async with semaphore:
        try:
            async with async_session_maker() as db:
                rel = await service.download_and_store(discogs_id, image_url, db)
            if rel:
                counters["ok"] += 1
            else:
                counters["skipped"] += 1
        except Exception as exc:
            counters["errors"] += 1
            logger.warning("mirror failed for %s: %s", discogs_id, exc)
        finally:
            counters["done"] += 1
            if counters["done"] % 100 == 0:
                elapsed = time.monotonic() - counters["t0"]
                rate = counters["done"] / max(elapsed, 1e-3)
                logger.info(
                    "mirror progress: done=%d ok=%d skipped=%d errors=%d rate=%.1f/s",
                    counters["done"], counters["ok"], counters["skipped"],
                    counters["errors"], rate,
                )


async def run_cover_mirror(concurrency: int, limit: int) -> None:
    """Phase 2 — bulk-mirror всех cover URLs через CoverStorageService."""
    async with async_session_maker() as db:
        targets = await _fetch_mirror_targets(db, limit)
    total = len(targets)
    if total == 0:
        logger.info("cover mirror: nothing to do")
        return

    logger.info("cover mirror: %d targets, concurrency=%d", total, concurrency)
    service = CoverStorageService()
    semaphore = asyncio.Semaphore(concurrency)
    counters = {"done": 0, "ok": 0, "skipped": 0, "errors": 0, "t0": time.monotonic()}

    await asyncio.gather(
        *[
            _mirror_one(semaphore, service, str(row[0]), row[1], counters)
            for row in targets
        ],
        return_exceptions=False,
    )

    elapsed = time.monotonic() - counters["t0"]
    logger.info(
        "cover mirror done in %.1fs: total=%d ok=%d skipped=%d errors=%d",
        elapsed, total, counters["ok"], counters["skipped"], counters["errors"],
    )


async def main(args) -> None:
    if not args.no_update:
        await run_sql_backfill()
    else:
        logger.info("SQL UPDATE skipped (--no-update)")

    if not args.no_mirror:
        await run_cover_mirror(args.concurrency, args.limit)
    else:
        logger.info("cover mirror skipped (--no-mirror)")


def _parse() -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--no-update", action="store_true", help="skip SQL UPDATE phase")
    p.add_argument("--no-mirror", action="store_true", help="skip cover-mirror phase")
    p.add_argument("--concurrency", type=int, default=10, help="parallel downloads")
    p.add_argument("--limit", type=int, default=0, help="limit mirror count (0=all)")
    return p.parse_args()


if __name__ == "__main__":
    asyncio.run(main(_parse()))
