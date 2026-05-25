"""CLI: одноразовый cleanup исторических дублей store-native ↔ discogs.

Что делает:
  Находит группы records, дублирующиеся по (lower(artist), lower(title), year):
  если в одной группе есть store-native запись (source='store', discogs_id=NULL,
  merged_into_id=NULL) И существует Discogs-запись с тем же (artist, title, year)
  (source='discogs', discogs_id NOT NULL) — мёрджит store-native в Discogs через
  safe_merge_store_native_into (перепривязывает листинги + soft-delete).

  Если у store-native есть discogs_id_candidate — используем его как target.
  Иначе берём самый старый Discogs-record из группы (heuristic: его, скорее
  всего, парсер уже видел и проверил).

  Пресс-версии одного master_id, у которых обе source='discogs', НЕ трогаем —
  они дедупятся на уровне SQL-витрин (см. /api/market.py, DISTINCT ON по
  COALESCE(r.discogs_master_id, r.id::text)).

Использование:
  python -m app.scripts.dedupe_store_native                  # dry-run, печатает план
  python -m app.scripts.dedupe_store_native --apply          # реально мерджит
  python -m app.scripts.dedupe_store_native --apply --limit=50

  --apply       без флага скрипт никого не трогает (safety-first)
  --limit N     максимум групп за один прогон (default: 100)
  --verbose     детальная печать по каждой группе
"""
from __future__ import annotations

import argparse
import asyncio
import logging
from typing import Iterable

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session_maker, close_db
from app.models.record import Record
from app.services.listing_matcher import safe_merge_store_native_into

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("dedupe_store_native")


async def _find_dup_groups(db: AsyncSession, limit: int) -> list[dict]:
    """Группы, в которых есть И store-native, И discogs-запись для одного альбома.

    Группируем по (lower(artist), lower(title), COALESCE(year, -1)) — year=NULL
    как отдельная корзина, чтобы не клеить «всё без года» в одну гигантскую группу.
    """
    sql = text(
        """
        WITH grouped AS (
            SELECT
                LOWER(artist) AS a, LOWER(title) AS t, COALESCE(year, -1) AS y,
                ARRAY_AGG(id ORDER BY created_at) AS ids,
                ARRAY_AGG(source ORDER BY created_at) AS sources,
                ARRAY_AGG(discogs_id ORDER BY created_at) AS discogs_ids,
                ARRAY_AGG(discogs_id_candidate ORDER BY created_at) AS candidates
            FROM records
            WHERE merged_into_id IS NULL
            GROUP BY LOWER(artist), LOWER(title), COALESCE(year, -1)
            HAVING COUNT(*) > 1
        )
        SELECT * FROM grouped
        WHERE 'store' = ANY(sources)
          AND EXISTS (
              SELECT 1 FROM unnest(sources, discogs_ids) AS u(src, did)
              WHERE u.src = 'discogs' AND u.did IS NOT NULL
          )
        LIMIT :limit
        """
    )
    rows = (await db.execute(sql, {"limit": limit})).mappings().all()
    return [dict(r) for r in rows]


async def _resolve_target_discogs_id(
    db: AsyncSession, source: Record, group: dict,
) -> str | None:
    """Выбрать discogs_id, куда мёрджить store-native.

    Приоритеты:
      1. source.discogs_id_candidate — если weekly_rematch уже подтвердил
      2. Самый старый Discogs-record в той же группе (artist+title+year)
    """
    if source.discogs_id_candidate:
        return source.discogs_id_candidate

    ids: list = group["ids"]
    sources: list[str] = group["sources"]
    discogs_ids: list[str | None] = group["discogs_ids"]
    for src, did in zip(sources, discogs_ids):
        if src == "discogs" and did:
            return did
    return None


async def dedupe(apply: bool, limit: int, verbose: bool) -> dict[str, int]:
    counters = {
        "groups_scanned": 0,
        "merge_planned": 0,
        "merge_applied": 0,
        "skipped_no_target": 0,
        "errors": 0,
    }

    async with async_session_maker() as db:
        groups = await _find_dup_groups(db, limit)
        counters["groups_scanned"] = len(groups)
        if not groups:
            logger.info("No duplicate groups found (limit=%d).", limit)
            return counters

        for group in groups:
            ids = group["ids"]
            sources = group["sources"]
            store_native_ids = [
                uid for uid, src in zip(ids, sources) if src == "store"
            ]

            for sn_id in store_native_ids:
                src_res = await db.execute(select(Record).where(Record.id == sn_id))
                source = src_res.scalar_one_or_none()
                if source is None or source.merged_into_id is not None:
                    continue

                target_did = await _resolve_target_discogs_id(db, source, group)
                if not target_did:
                    counters["skipped_no_target"] += 1
                    if verbose:
                        logger.info(
                            "skip %s (%s — %s): no target discogs_id",
                            sn_id, source.artist, source.title,
                        )
                    continue

                counters["merge_planned"] += 1
                if verbose or not apply:
                    logger.info(
                        "%s merge: store-native %s (%s — %s, %s) → discogs_id=%s",
                        "WOULD" if not apply else "WILL",
                        sn_id, source.artist, source.title, source.year, target_did,
                    )

                if not apply:
                    continue

                sp = await db.begin_nested()
                try:
                    res = await safe_merge_store_native_into(
                        source, target_did, db, merged_by="cli",
                    )
                    if res["target_found"]:
                        counters["merge_applied"] += 1
                        logger.info(
                            "MERGED %s → discogs_id=%s (remapped %d listings)",
                            sn_id, target_did, res["listings_remapped"],
                        )
                    else:
                        counters["skipped_no_target"] += 1
                        logger.warning(
                            "target discogs_id=%s not in local DB — skipped %s",
                            target_did, sn_id,
                        )
                    await sp.commit()
                except Exception:
                    await sp.rollback()
                    counters["errors"] += 1
                    logger.exception("merge failed for %s", sn_id)

        if apply:
            try:
                await db.commit()
            except Exception:
                await db.rollback()
                counters["errors"] += counters["merge_applied"]
                counters["merge_applied"] = 0
                logger.exception("commit failed")

    return counters


async def _main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--apply", action="store_true",
        help="реально объединить (без флага — dry-run)",
    )
    parser.add_argument(
        "--limit", type=int, default=100,
        help="максимум групп за прогон (default: 100)",
    )
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    if not args.apply:
        logger.info("DRY-RUN — ничего не меняем. Добавь --apply, чтобы запустить merge.")

    counters = await dedupe(apply=args.apply, limit=args.limit, verbose=args.verbose)
    logger.info("dedupe_store_native: %s", counters)
    await close_db()


if __name__ == "__main__":
    asyncio.run(_main())
