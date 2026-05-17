"""
Pydantic-схемы для API offers.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class StoreInfo(BaseModel):
    slug: str
    name: str
    logo_url: str | None = None
    rating: float = 0.0


class OfferResponse(BaseModel):
    listing_id: UUID
    store: StoreInfo
    price_rub: Decimal | None = None
    condition: str | None = None
    vinyl_color: str | None = None
    format: str | None = None
    url: str = Field(
        ...,
        description=(
            "UTM-обогащённая ссылка магазина (без affiliate-subid). "
            "Mobile перед открытием должен вызвать POST /api/offers/{id}/click "
            "и использовать оттуда финальный URL с subid для аттрибуции."
        ),
    )
    status: str
    last_seen_at: datetime


class OfferClickResponse(BaseModel):
    """Ответ POST /api/offers/{id}/click — финальный URL для Linking.openURL."""
    click_id: UUID
    url: str = Field(..., description="Полный URL с affiliate-обёрткой и subid=click_id")


class MarketCarouselItem(BaseModel):
    """
    Карточка для карусели «В наличии сейчас» в поиске (Mobile/app/(tabs)/search.tsx).

    Один элемент = одна запись (`Record`). Если на запись висят несколько листингов
    из разных магазинов — здесь только самый дешёвый. Это даёт «N разных пластинок»
    в карусели вместо «N дублей одной обложки».
    """
    record_id: UUID
    discogs_id: str | None = None
    artist: str
    title: str
    year: int | None = None
    format_type: str | None = None
    cover_image_url: str | None = None
    min_price_rub: Decimal
    store_slug: str = Field(..., description="Магазин с минимальной ценой — для аналитики")
    first_seen_at: datetime = Field(..., description="Когда впервые увидели в продаже")
