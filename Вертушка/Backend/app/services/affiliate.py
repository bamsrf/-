"""
Affiliate-overlay для ссылок в магазины.

Store.affiliate_program — JSONB вида:
    {
        "type": "admitad" | "epn" | "cityads" | "yandex_market" | "direct",
        "deeplink_template": "https://ad.admitad.com/g/{adcode}/?ulp={url}",
        "params": {"adcode": "abc123"}
    }

`wrap_url(store, url)` → если есть программа, возвращает партнёрскую ссылку,
иначе оригинал.
"""
from __future__ import annotations

import logging
from urllib.parse import quote

from app.models.store import Store

logger = logging.getLogger(__name__)


_KNOWN_TYPES = {"admitad", "epn", "cityads", "yandex_market", "direct"}


def wrap_url(store: Store, url: str) -> str:
    """Обернуть URL в партнёрский шаблон если есть программа."""
    prog = store.affiliate_program
    if not prog or not isinstance(prog, dict):
        return url

    prog_type = prog.get("type")
    if prog_type in (None, "direct"):
        return url
    if prog_type not in _KNOWN_TYPES:
        logger.warning("Unknown affiliate type %r for store %s", prog_type, store.slug)
        return url

    template = prog.get("deeplink_template")
    if not template:
        return url

    params = prog.get("params") or {}
    try:
        return template.format(url=quote(url, safe=""), **params)
    except (KeyError, IndexError, ValueError) as e:
        logger.warning("Affiliate template error for %s: %s", store.slug, e)
        return url
