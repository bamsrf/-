"""
robots.txt-чекер с Redis-кэшем (TTL 24ч).

Использование:
    if not await is_allowed(http, "https://shop.ru/product/123", ua):
        skip
"""
import logging
import urllib.robotparser
from urllib.parse import urlparse

import httpx

from app.services.cache import cache

logger = logging.getLogger(__name__)


_ROBOTS_TTL = 24 * 3600
_CACHE_NS = "scraper:robots"


async def _fetch_robots_txt(client: httpx.AsyncClient, domain_url: str) -> str | None:
    """Скачать /robots.txt. None если 404/network — трактуем как «всё разрешено»."""
    robots_url = f"{domain_url.rstrip('/')}/robots.txt"
    try:
        resp = await client.get(robots_url, timeout=10.0, follow_redirects=True)
        if resp.status_code >= 400:
            return ""
        return resp.text
    except Exception:
        logger.debug("robots.txt fetch failed for %s", domain_url, exc_info=True)
        return None


async def is_allowed(client: httpx.AsyncClient, url: str, user_agent: str) -> bool:
    """True если URL разрешён robots.txt (или robots.txt недоступен)."""
    parsed = urlparse(url)
    if not parsed.netloc:
        return True
    domain_root = f"{parsed.scheme}://{parsed.netloc}"

    cached = await cache.get(_CACHE_NS, parsed.netloc)
    if cached is None:
        body = await _fetch_robots_txt(client, domain_root)
        if body is None:
            await cache.set(_CACHE_NS, parsed.netloc, "", ttl=300)  # короткий retry
            return True
        await cache.set(_CACHE_NS, parsed.netloc, body, ttl=_ROBOTS_TTL)
        cached = body

    if not cached:
        return True

    rp = urllib.robotparser.RobotFileParser()
    rp.parse(cached.splitlines())
    return rp.can_fetch(user_agent, url)
