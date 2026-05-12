"""CLI: ручной запуск парсинга магазинов.

Использование:
  python -m app.scripts.scrape_all --list                          # показать активные магазины
  python -m app.scripts.scrape_all --slug=plastinka_com            # один магазин (full)
  python -m app.scripts.scrape_all --slug=plastinka_com --limit=50 # ограниченный прогон
  python -m app.scripts.scrape_all --all                           # все активные http-магазины
  python -m app.scripts.scrape_all --all --include-browser         # включая requires_browser
  python -m app.scripts.scrape_all --match-only                    # только матчер unmatched

Не запускает APScheduler — обычное standalone использование.
"""
import argparse
import asyncio
import logging

from sqlalchemy import select

from app.database import async_session_maker, close_db
from app.models.store import Store
from app.services.cache import cache
from app.services.scrapers.http_client import http_client
from app.services.scrapers.browser import browser_pool
from app.services.scrapers.runner import crawl_store
from app.services.scrapers.shops import *  # noqa: F401,F403  — register all parsers
from app.services.scrapers.registry import all_parsers
from app.services.listing_matcher import match_unmatched_batch

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("scrape_all")


async def _list_stores() -> None:
    async with async_session_maker() as db:
        res = await db.execute(select(Store).order_by(Store.slug))
        stores = list(res.scalars().all())

    parsers_set = set(all_parsers().keys())
    print(f"\nЗарегистрированные парсеры: {sorted(parsers_set) or '(нет)'}")
    print(f"\nМагазины в БД ({len(stores)}):")
    for s in stores:
        marker = "✅" if s.is_active else "💤"
        cf = " [CF]" if s.requires_browser else ""
        in_reg = "✓" if s.parser_class in parsers_set else "❌ no parser"
        print(f"  {marker} {s.slug:25s} → {s.parser_class:20s} {cf} {in_reg}")


async def _crawl_one(slug: str, limit: int | None, mode: str) -> None:
    res = await crawl_store(slug, mode=mode, limit=limit)
    print(f"[{slug}] {res}")


async def _crawl_all(include_browser: bool, mode: str) -> None:
    async with async_session_maker() as db:
        stmt = select(Store).where(Store.is_active.is_(True))
        if not include_browser:
            stmt = stmt.where(Store.requires_browser.is_(False))
        stores = list((await db.execute(stmt)).scalars().all())

    print(f"Запускаю {len(stores)} магазинов в режиме {mode}...")
    for s in stores:
        try:
            res = await crawl_store(s.slug, mode=mode)
            print(f"[{s.slug}] {res}")
        except Exception as e:
            print(f"[{s.slug}] FAILED: {e}")


async def _match_only(batch: int) -> None:
    res = await match_unmatched_batch(batch_size=batch)
    print(f"matcher: {res}")


async def main_async(args: argparse.Namespace) -> None:
    await cache.connect()
    try:
        if args.list:
            await _list_stores()
        elif args.match_only:
            await _match_only(args.batch)
        elif args.all:
            await _crawl_all(args.include_browser, args.mode)
            if not args.no_match:
                await _match_only(args.batch)
        elif args.slug:
            await _crawl_one(args.slug, args.limit, args.mode)
            if not args.no_match:
                await _match_only(args.batch)
        else:
            print("Не указано что делать. См. --help.")
    finally:
        await browser_pool.aclose()
        await http_client.aclose()
        await cache.close()
        await close_db()


def main() -> None:
    p = argparse.ArgumentParser(description="Vertushka shop scraper CLI")
    p.add_argument("--slug", help="slug одного магазина для парсинга")
    p.add_argument("--all", action="store_true", help="парсить все активные магазины")
    p.add_argument("--include-browser", action="store_true", help="включая requires_browser=True")
    p.add_argument("--mode", choices=("full", "incremental"), default="full")
    p.add_argument("--limit", type=int, default=None, help="максимум листингов на магазин")
    p.add_argument("--list", action="store_true", help="показать магазины и зарегистрированные парсеры")
    p.add_argument("--match-only", action="store_true", help="только матчить unmatched, без парсинга")
    p.add_argument("--no-match", action="store_true", help="пропустить матчинг после парсинга")
    p.add_argument("--batch", type=int, default=500, help="batch size для matcher (default 500)")
    args = p.parse_args()

    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
