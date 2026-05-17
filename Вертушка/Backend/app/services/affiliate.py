"""
Affiliate-overlay для ссылок в магазины.

Что делает `wrap_url`:
1. Всегда добавляет UTM-метки к оригинальному URL — даже если у магазина нет
   партнёрской программы. Это безопасно (магазин видит в Google Analytics
   откуда пришёл трафик) и помогает в переговорах о прямой партнёрке:
   «смотрите, мы дали вам N посетителей за месяц».
2. Если у магазина настроена `affiliate_program` — оборачивает UTM-URL в
   партнёрский deeplink (Admitad/EPN/Cityads). Магазин получает наш `subid`
   — стабильный идентификатор клика, который мы сохранили в `offer_clicks.id`.
   В отчётах партнёрской сети мы потом найдём конверсии по нашему subid.

Store.affiliate_program — JSONB. Поддерживается ДВА основных сценария
(см. docs/plans/SHOPS_PARSING.md §13 — гибрид direct + CPA):

A) CPA-сеть (Admitad / EPN / CityAds / Yandex.Market) — для маркетплейсов:
    {
        "type": "admitad",
        "deeplink_template": "https://ad.admitad.com/g/{adcode}/?ulp={url}&subid={subid}",
        "params": {"adcode": "abc123"},
        "commission_pct": 5.0,
        "cookie_window_days": 30
    }
    → wrap_url оборачивает в Admitad-deeplink с subid=click_id

B) Direct-партнёрка (личная договорённость с владельцем магазина,
   основной сценарий для нишевых винил-магазинов в РФ):
    {
        "type": "direct",
        "deeplink_template": null,
        "params": {},
        "commission_pct": 5.0,
        "promo_code": "VERTUSHKA10",
        "contact": "owner@plastinka.com",
        "negotiated_at": "2026-06-15",
        "payout_method": "bank_transfer",
        "notes": "5% от чистого заказа, выплата 1-го числа месяца"
    }
    → wrap_url отдаёт исходный URL только с UTM-метками. Магазин читает
      UTM в Google Analytics, раз в месяц считает заказы с нашими UTM,
      выплачивает comission_pct. Промокод опц. — даёт юзеру скидку и
      работает как ещё один трекинг-канал.

Если affiliate_program не задан (NULL) — wrap_url добавляет только UTM
(=аналогично direct), без обязательств по выплатам.

Все плейсхолдеры в `deeplink_template`:
    {url}     — уже UTM-обогащённый URL магазина, urlencoded
    {subid}   — наш OfferClick.id (UUID) либо `anon-{listing_id}` для guest
    {params}  — раскрываются как kwargs из affiliate_program.params
"""
from __future__ import annotations

import logging
from urllib.parse import quote, urlencode, urlparse, urlunparse, parse_qsl

from app.models.store import Store

logger = logging.getLogger(__name__)


_KNOWN_TYPES = {"admitad", "epn", "cityads", "yandex_market", "direct"}

# UTM-параметры на ВСЕ ссылки (даже не-affiliate) — Google Analytics магазина
# показывает откуда трафик. Полезно для переговоров и для нас (узнаём что
# конкретный листинг ещё жив, даже если партнёрки нет).
_DEFAULT_UTM = {
    "utm_source": "vertushka",
    "utm_medium": "mobile",
    "utm_campaign": "offers",
}


def wrap_url(
    store: Store,
    url: str,
    *,
    subid: str | None = None,
    user_id: str | None = None,
) -> str:
    """
    Обернуть URL магазина для трекинга.

    Args:
        store: запись магазина из БД (с полем `affiliate_program`)
        url: оригинальная ссылка на товар
        subid: уникальный ID клика (мы передаём OfferClick.id). Если нет —
            будет 'anon'. В партнёрском deeplink это поле магазин обязан
            вернуть нам в отчёте.
        user_id: ID пользователя (если авторизован). Идёт в utm_content.

    Returns:
        Готовая ссылка для Linking.openURL. Не падает на ошибках конфигурации
        — в крайнем случае возвращает оригинальный URL.
    """
    # 1. UTM-обогащение — всегда
    enriched_url = _add_utm(url, user_id=user_id)

    # 2. Affiliate-обёртка — если настроено
    prog = store.affiliate_program
    if not prog or not isinstance(prog, dict):
        return enriched_url

    prog_type = prog.get("type")
    if prog_type in (None, "direct"):
        return enriched_url
    if prog_type not in _KNOWN_TYPES:
        logger.warning("Unknown affiliate type %r for store %s", prog_type, store.slug)
        return enriched_url

    template = prog.get("deeplink_template")
    if not template:
        return enriched_url

    params = prog.get("params") or {}
    try:
        return template.format(
            url=quote(enriched_url, safe=""),
            subid=quote(subid or "anon", safe=""),
            **params,
        )
    except (KeyError, IndexError, ValueError) as e:
        logger.warning("Affiliate template error for %s: %s", store.slug, e)
        return enriched_url


def _add_utm(url: str, *, user_id: str | None = None) -> str:
    """Добавляет наши UTM-метки к URL, не затирая существующие магазинские."""
    try:
        parts = urlparse(url)
    except Exception:
        return url

    existing = dict(parse_qsl(parts.query, keep_blank_values=True))
    # Магазинские UTM имеют приоритет — если их прислал сам магазин, не трогаем.
    for k, v in _DEFAULT_UTM.items():
        existing.setdefault(k, v)
    if user_id:
        existing.setdefault("utm_content", f"u_{user_id}")

    return urlunparse(parts._replace(query=urlencode(existing)))
