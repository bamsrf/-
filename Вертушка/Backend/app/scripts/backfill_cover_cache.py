"""
Bulk-backfill cover images for all in-stock listings that have an external URL
but no local cover_local_path yet.

Covers two record kinds:
  • source='discogs' (has discogs_id) → saved as covers/{discogs_id}.jpg
  • source='store'   (no discogs_id)  → saved as covers/store/{record_id}.jpg

Downloads are rate-limited to avoid hammering third-party CDNs.
Progress is logged every 100 records.

Usage:
  python -m app.scripts.backfill_cover_cache [options]

Options:
  --concurrency N   Parallel download workers (default: 8)
  --dry-run         Log what would be downloaded; no actual downloads
  --stale-days N    Only consider listings seen in the last N days (default: 7)
"""
from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
import uuid
from datetime import datetime, timedelta
from io import BytesIO
from pathlib import Path

import httpx
from PIL import Image
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database import async_session_maker
from app.models.record import Record

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("backfill_cover_cache")

_MAX_SIDE = 500
_JPEG_QUALITY = 85
_DOWNLOAD_TIMEOUT = 30
_LOG_EVERY = 100


async def _fetch_candidates(stale_days: int) -> list[dict]:
    """Return all in-stock records needing cover backfill."""
    cutoff = datetime.utcnow() - timedelta(days=stale_days)
    async with async_session_maker() as db:
        rows = (await db.execute(text(
            """
            SELECT DISTINCT ON (r.id)
                r.id          AS record_id,
                r.discogs_id,
                r.source,
                COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') AS image_url
            FROM store_listings sl
            JOIN stores s ON s.id = sl.store_id
            JOIN records r ON r.id = sl.matched_record_id
            WHERE s.is_active = true
              AND sl.status = 'in_stock'
              AND sl.last_seen_at >= :cutoff
              AND r.cover_local_path IS NULL
              AND r.merged_into_id IS NULL
              AND COALESCE(r.cover_image_url, sl.raw_payload->>'image_url') IS NOT NULL
            ORDER BY r.id, sl.price_rub ASC NULLS LAST
            """
        ), {"cutoff": cutoff})).mappings().all()
    return [dict(r) for r in rows]


async def _download_one(
    sem: asyncio.Semaphore,
    client: httpx.AsyncClient,
    rec: dict,
    covers_dir: Path,
    *,
    dry_run: bool,
) -> str:
    """Download and save a single cover. Returns status string."""
    image_url: str = rec["image_url"]
    record_id: uuid.UUID = rec["record_id"]
    discogs_id: str | None = rec["discogs_id"]
    source: str = rec["source"]

    if source == "store" or not discogs_id:
        dest_subdir = covers_dir / "store"
        filename = f"{record_id}.jpg"
        rel_path = f"covers/store/{filename}"
    else:
        dest_subdir = covers_dir
        filename = f"{discogs_id}.jpg"
        rel_path = f"covers/{filename}"

    dest = dest_subdir / filename
    if dest.exists():
        # File exists but DB not updated — fix the record
        if not dry_run:
            async with async_session_maker() as db:
                await db.execute(
                    update(Record)
                    .where(Record.id == record_id, Record.cover_local_path.is_(None))
                    .values(cover_local_path=rel_path, cover_cached_at=datetime.utcnow())
                )
                await db.commit()
        return "already_exists"

    if dry_run:
        return "would_download"

    async with sem:
        try:
            resp = await client.get(image_url, timeout=_DOWNLOAD_TIMEOUT)
            if resp.status_code in (403, 404, 410):
                # Dead URL → null out cover_image_url so market filters it
                async with async_session_maker() as db:
                    await db.execute(
                        update(Record)
                        .where(Record.id == record_id)
                        .values(cover_image_url=None)
                    )
                    await db.commit()
                return f"dead_{resp.status_code}"
            resp.raise_for_status()
            raw = resp.content
        except Exception as exc:
            return f"error:{exc}"

    try:
        img = Image.open(BytesIO(raw)).convert("RGB")
        if img.width > _MAX_SIDE or img.height > _MAX_SIDE:
            img.thumbnail((_MAX_SIDE, _MAX_SIDE), Image.LANCZOS)

        dest_subdir.mkdir(parents=True, exist_ok=True)
        tmp = dest_subdir / f".tmp_{record_id}_{uuid.uuid4().hex}.jpg"
        img.save(tmp, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
        os.rename(tmp, dest)
    except Exception as exc:
        return f"img_error:{exc}"

    try:
        async with async_session_maker() as db:
            await db.execute(
                update(Record)
                .where(Record.id == record_id, Record.cover_local_path.is_(None))
                .values(cover_local_path=rel_path, cover_cached_at=datetime.utcnow())
            )
            await db.commit()
    except Exception as exc:
        return f"db_error:{exc}"

    return "ok"


async def run(*, concurrency: int, dry_run: bool, stale_days: int) -> None:
    from app.config import get_settings

    settings = get_settings()
    covers_dir = Path(settings.covers_dir)
    covers_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Fetching candidates (stale_days=%d)…", stale_days)
    candidates = await _fetch_candidates(stale_days)
    total = len(candidates)
    logger.info("Found %d records needing cover backfill", total)

    if total == 0:
        return

    counters: dict[str, int] = {}

    sem = asyncio.Semaphore(concurrency)
    limits = httpx.Limits(max_connections=concurrency + 4, max_keepalive_connections=concurrency)
    async with httpx.AsyncClient(follow_redirects=True, limits=limits) as client:
        tasks = [
            _download_one(sem, client, rec, covers_dir, dry_run=dry_run)
            for rec in candidates
        ]
        for i, coro in enumerate(asyncio.as_completed(tasks), start=1):
            status = await coro
            counters[status] = counters.get(status, 0) + 1
            if i % _LOG_EVERY == 0 or i == total:
                ok = counters.get("ok", 0)
                exists = counters.get("already_exists", 0)
                dead = sum(v for k, v in counters.items() if k.startswith("dead"))
                errs = sum(v for k, v in counters.items() if "error" in k)
                logger.info(
                    "[%d/%d] ok=%d exists=%d dead=%d errors=%d",
                    i, total, ok, exists, dead, errs,
                )

    logger.info("=== Done ===")
    for k, v in sorted(counters.items()):
        logger.info("  %-25s %d", k, v)


def main() -> None:
    parser = argparse.ArgumentParser(description="Bulk backfill cover images to local storage")
    parser.add_argument("--concurrency", type=int, default=8, metavar="N")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--stale-days", type=int, default=7, metavar="N")
    args = parser.parse_args()

    if args.dry_run:
        logger.info("=== DRY-RUN mode ===")

    asyncio.run(run(
        concurrency=args.concurrency,
        dry_run=args.dry_run,
        stale_days=args.stale_days,
    ))


if __name__ == "__main__":
    main()
