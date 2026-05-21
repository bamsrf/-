"""Подбор рублёвой цены пластинки из листингов магазинов-партнёров.

Используется для локальных (РФ/СССР) релизов. Логика двух уровней:
  1. Активные офферы (`status='in_stock'`) — MIN/MEDIAN/MAX по всем магазинам.
  2. Исторические офферы (любой статус, `last_seen_at > now - 365d`) —
     только MEDIAN, без min/max, чтобы единичные выбросы не ломали оценку.

Если данных нет ни в одном слое — функция возвращает None, и вызывающая
сторона должна откатиться на USD × курс ЦБ без коэффициента.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal, Optional
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.store_listing import ListingStatus

PriceSource = Literal[
    "marketplace_active",       # активные in_stock листинги в RU-магазинах
    "marketplace_historical",   # архивные офферы за последние 365 дней
    "discogs_raw",              # USD × курс без коэффициента (fallback)
    "discogs_import_estimate",  # USD × импортная формула (не-локальные)
]

HISTORICAL_WINDOW_DAYS = 365


@dataclass(frozen=True)
class MarketplacePrice:
    min_rub: Optional[float]
    median_rub: Optional[float]
    max_rub: Optional[float]
    offers_count: int
    source: PriceSource


async def marketplace_price_range(
    record_id: UUID,
    db: AsyncSession,
) -> Optional[MarketplacePrice]:
    """Подбирает диапазон цен из листингов магазинов для конкретной записи.

    Возвращает None, если по записи нет ни активных, ни недавних архивных офферов.
    """
    # 1) активные in_stock офферы — явный SQL ради percentile_cont
    active_row = (
        await db.execute(
            text(
                """
                SELECT
                    MIN(price_rub)::float AS min_rub,
                    percentile_cont(0.5) WITHIN GROUP (ORDER BY price_rub)::float AS median_rub,
                    MAX(price_rub)::float AS max_rub,
                    COUNT(*) AS offers_count
                FROM store_listings
                WHERE matched_record_id = :record_id
                  AND status = :in_stock
                  AND price_rub IS NOT NULL
                """
            ),
            {"record_id": str(record_id), "in_stock": ListingStatus.IN_STOCK},
        )
    ).mappings().first()

    if active_row and (active_row.get("offers_count") or 0) > 0:
        return MarketplacePrice(
            min_rub=_round(active_row["min_rub"]),
            median_rub=_round(active_row["median_rub"]),
            max_rub=_round(active_row["max_rub"]),
            offers_count=int(active_row["offers_count"]),
            source="marketplace_active",
        )

    # 2) исторические — любой статус, последние 365 дней, только MEDIAN
    cutoff = datetime.utcnow() - timedelta(days=HISTORICAL_WINDOW_DAYS)
    historical_row = (
        await db.execute(
            text(
                """
                SELECT
                    percentile_cont(0.5) WITHIN GROUP (ORDER BY price_rub)::float AS median_rub,
                    COUNT(*) AS offers_count
                FROM store_listings
                WHERE matched_record_id = :record_id
                  AND price_rub IS NOT NULL
                  AND last_seen_at >= :cutoff
                """
            ),
            {"record_id": str(record_id), "cutoff": cutoff},
        )
    ).mappings().first()

    if historical_row and (historical_row.get("offers_count") or 0) > 0:
        median = _round(historical_row["median_rub"])
        return MarketplacePrice(
            min_rub=None,
            median_rub=median,
            max_rub=None,
            offers_count=int(historical_row["offers_count"]),
            source="marketplace_historical",
        )

    return None


def _round(value: Optional[float]) -> Optional[float]:
    if value is None:
        return None
    return round(float(value), 0)
