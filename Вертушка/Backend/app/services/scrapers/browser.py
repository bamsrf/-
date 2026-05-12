"""
Pool Playwright-контекстов для рендеринга JS-страниц.

Запускается лениво — только когда парсер потребовал. Импорт playwright тоже
ленивый, чтобы зависимость не падала на инстансах без браузера.
"""
from __future__ import annotations

import asyncio
import logging

from app.services.scrapers.ua_pool import random_headers

logger = logging.getLogger(__name__)


class BrowserPool:
    """Простой pool из N контекстов Chromium. Семафор гарантирует не больше
    `concurrency` одновременных страниц.
    """

    def __init__(self, concurrency: int = 2):
        self._concurrency = concurrency
        self._sem = asyncio.Semaphore(concurrency)
        self._playwright = None
        self._browser = None
        self._lock = asyncio.Lock()

    async def _ensure_started(self) -> None:
        if self._browser is not None:
            return
        async with self._lock:
            if self._browser is not None:
                return
            try:
                from playwright.async_api import async_playwright
            except ImportError as e:
                raise RuntimeError(
                    "playwright не установлен. Запусти `pip install playwright && "
                    "playwright install chromium`"
                ) from e
            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--no-sandbox",
                ],
            )
            logger.info("BrowserPool started (concurrency=%d)", self._concurrency)

    async def fetch_text(self, url: str, *, wait_until: str = "networkidle") -> str:
        """Открыть страницу, дождаться рендера, вернуть полный HTML."""
        await self._ensure_started()
        headers = random_headers()
        async with self._sem:
            assert self._browser is not None
            context = await self._browser.new_context(
                user_agent=headers["User-Agent"],
                locale="ru-RU",
                extra_http_headers={
                    k: v for k, v in headers.items() if k.lower() not in ("user-agent",)
                },
                viewport={"width": 1366, "height": 768},
            )
            try:
                page = await context.new_page()
                try:
                    await page.goto(url, wait_until=wait_until, timeout=45_000)
                    return await page.content()
                finally:
                    await page.close()
            finally:
                await context.close()

    async def aclose(self) -> None:
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
            logger.info("BrowserPool closed")


# Singleton — лениво стартует
browser_pool = BrowserPool()
