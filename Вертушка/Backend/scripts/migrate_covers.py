"""
Скрипт миграции обложек.

Скачивает обложки для всех записей, которые есть в коллекциях/вишлистах,
но ещё не имеют локально сохранённой обложки.

Запуск:
    cd Вертушка/Backend
    python -m scripts.migrate_covers

Флаги:
    --batch-size N     Размер батча (по умолчанию 50)
    --delay S          Задержка между батчами в секундах (по умолчанию 1.0)
    --dry-run          Только посчитать кол-во записей, ничего не скачивать
    --limit N          Ограничить общее кол-во обрабатываемых записей
"""
import argparse
import asyncio
import logging
import sys
from pathlib import Path

# Добавляем корень проекта в PYTHONPATH
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session_maker, init_db, close_db
from app.services.cover_storage import CoverStorageService
from app.services.cache import cache

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("migrate_covers")


# SQL с дедупликацией по discogs_id
_SQL_PENDING = text("""
    SELECT DISTINCT r.discogs_id, r.cover_image_url, r.id
    FROM records r
    WHERE r.cover_local_path IS NULL
      AND r.discogs_id IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM collection_items ci WHERE ci.record_id = r.id)
        OR EXISTS (SELECT 1 FROM wishlist_items wi WHERE wi.record_id = r.id)
      )
    ORDER BY r.discogs_id
    LIMIT :limit OFFSET :offset
""")

_SQL_COUNT = text("""
    SELECT COUNT(DISTINCT r.discogs_id)
    FROM records r
    WHERE r.cover_local_path IS NULL
      AND r.discogs_id IS NOT NULL
      AND (
        EXISTS (SELECT 1 FROM collection_items ci WHERE ci.record_id = r.id)
        OR EXISTS (SELECT 1 FROM wishlist_items wi WHERE wi.record_id = r.id)
      )
""")


async def _get_fresh_cover_url(discogs_id: str) -> str | None:
    """
    Запрашивает свежий (не истёкший) URL обложки из Discogs API.
    Возвращает None если не удалось получить.
    """
    from app.services.discogs import discogs_service

    try:
        release_data = await discogs_service.get_release(discogs_id)
        # get_release возвращает dict с ключом cover_image_url или cover_image
        url = (
            release_data.get("cover_image_url")
            or release_data.get("cover_image")
        )
        return url
    except Exception as exc:
        logger.warning("Discogs API error for %s: %s", discogs_id, exc)
        return None


async def _process_batch(
    batch: list[dict],
    service: CoverStorageService,
    db: AsyncSession,
    stats: dict,
) -> None:
    """Обрабатывает один батч записей."""
    for row in batch:
        discogs_id = row["discogs_id"]
        cover_url = row["cover_image_url"]

        # Получаем свежий URL из Discogs (signed URL в БД мог протухнуть)
        fresh_url = await _get_fresh_cover_url(discogs_id)
        if fresh_url:
            cover_url = fresh_url
        elif not cover_url:
            logger.info("  ⚠ %s — нет URL обложки, пропуск", discogs_id)
            stats["skipped"] += 1
            continue

        logger.info("  ↓ Скачиваем обложку для %s ...", discogs_id)
        result = await service.download_and_store(discogs_id, cover_url, db)

        if result:
            logger.info("  ✓ %s → %s", discogs_id, result)
            stats["downloaded"] += 1
        else:
            logger.warning("  ✗ %s — не удалось скачать", discogs_id)
            stats["failed"] += 1


async def run(
    batch_size: int = 50,
    delay: float = 1.0,
    dry_run: bool = False,
    limit: int | None = None,
) -> None:
    settings = get_settings()
    logger.info("Инициализация БД и Redis...")
    await init_db()
    await cache.connect()

    try:
        async with async_session_maker() as db:
            # Считаем общее количество
            count_result = await db.execute(_SQL_COUNT)
            total = count_result.scalar_one()

        if limit:
            total = min(total, limit)

        logger.info(
            "Записей без локальной обложки в коллекциях/вишлистах: %d", total
        )

        if dry_run:
            logger.info("Dry-run: выход без скачивания.")
            return

        if total == 0:
            logger.info("Нечего скачивать. Готово.")
            return

        service = CoverStorageService()
        stats = {"downloaded": 0, "skipped": 0, "failed": 0}
        processed = 0
        offset = 0

        while processed < total:
            current_batch_size = min(batch_size, total - processed)

            async with async_session_maker() as db:
                result = await db.execute(
                    _SQL_PENDING,
                    {"limit": current_batch_size, "offset": offset},
                )
                rows = [
                    {"discogs_id": r.discogs_id, "cover_image_url": r.cover_image_url}
                    for r in result.all()
                ]

            if not rows:
                break

            logger.info(
                "Батч %d-%d / %d",
                processed + 1,
                processed + len(rows),
                total,
            )

            async with async_session_maker() as db:
                await _process_batch(rows, service, db, stats)

            processed += len(rows)
            offset += len(rows)

            if processed < total:
                logger.info(
                    "  Пауза %.1f с (rate limit)... [%d/%d готово]",
                    delay,
                    processed,
                    total,
                )
                await asyncio.sleep(delay)

        logger.info(
            "\n=== Миграция завершена ===\n"
            "  Скачано:  %d\n"
            "  Пропущено: %d\n"
            "  Ошибки:   %d\n"
            "  Итого:    %d",
            stats["downloaded"],
            stats["skipped"],
            stats["failed"],
            total,
        )

    finally:
        await cache.close()
        await close_db()


def main() -> None:
    parser = argparse.ArgumentParser(description="Миграция обложек виниловых пластинок")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=50,
        help="Размер батча (по умолчанию 50)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=1.0,
        help="Задержка между батчами в секундах (по умолчанию 1.0)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Только посчитать записи, ничего не скачивать",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Ограничить общее кол-во обрабатываемых записей",
    )
    args = parser.parse_args()

    asyncio.run(
        run(
            batch_size=args.batch_size,
            delay=args.delay,
            dry_run=args.dry_run,
            limit=args.limit,
        )
    )


if __name__ == "__main__":
    main()
