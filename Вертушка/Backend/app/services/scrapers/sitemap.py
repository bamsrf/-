"""
Парсинг sitemap.xml / sitemap-index / yml.xml через streaming.

Поддерживает:
- обычный <urlset> с <loc>
- sitemap-index с <sitemap><loc>...
- gzip (httpx раскодит сам если Content-Encoding)
- YML-фиды (<offers><offer url="..."/>)
"""
from __future__ import annotations

import gzip
import io
import logging
import re
from typing import AsyncIterator

from lxml import etree

from app.services.scrapers.http_client import ScraperHttpClient

logger = logging.getLogger(__name__)


_NS = {
    "sm": "http://www.sitemaps.org/schemas/sitemap/0.9",
}


async def iter_sitemap_urls(
    http: ScraperHttpClient,
    sitemap_url: str,
    url_pattern: str | None = None,
    max_depth: int = 2,
) -> AsyncIterator[str]:
    """Итерируется по URL'ам товаров из sitemap или YML-фида.

    - Если корень — sitemap-index, рекурсивно (до max_depth) подгружаем дочерние.
    - Если YML-фид (`<yml_catalog>`), берём `<offer url="...">`.
    - url_pattern: regex; если задан, отдаём только URL, матчащие его.
    """
    raw = await http.get_bytes(sitemap_url, respect_robots=False)

    # gzip-распаковка если httpx не сделал
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)

    try:
        root = etree.fromstring(raw)
    except etree.XMLSyntaxError as e:
        logger.warning("sitemap parse error %s: %s", sitemap_url, e)
        return

    pattern = re.compile(url_pattern) if url_pattern else None

    tag = etree.QName(root).localname

    if tag == "sitemapindex":
        if max_depth <= 0:
            return
        child_urls = [el.text for el in root.findall("sm:sitemap/sm:loc", _NS)]
        for child in child_urls:
            if not child:
                continue
            try:
                async for u in iter_sitemap_urls(http, child, url_pattern, max_depth - 1):
                    yield u
            except Exception:
                logger.debug("nested sitemap failed: %s", child, exc_info=True)
                continue

    elif tag == "urlset":
        for loc in root.findall("sm:url/sm:loc", _NS):
            if loc.text and (pattern is None or pattern.search(loc.text)):
                yield loc.text

    elif tag == "yml_catalog":
        # YML-формат Яндекс.Маркета
        for offer in root.iter("offer"):
            url = offer.get("url") or (offer.find("url").text if offer.find("url") is not None else None)
            if url and (pattern is None or pattern.search(url)):
                yield url

    else:
        logger.warning("unknown sitemap root <%s> at %s", tag, sitemap_url)


async def iter_yml_offers(http: ScraperHttpClient, yml_url: str):
    """Стримит `<offer>` элементы из YML-фида целиком (для парсеров, которые
    хотят вытащить данные сразу из фида без захода на товарную страницу).

    Yields: lxml.etree._Element
    """
    raw = await http.get_bytes(yml_url, respect_robots=False)
    if raw[:2] == b"\x1f\x8b":
        raw = gzip.decompress(raw)

    try:
        root = etree.fromstring(raw)
    except etree.XMLSyntaxError as e:
        logger.warning("yml parse error %s: %s", yml_url, e)
        return

    for offer in root.iter("offer"):
        yield offer
