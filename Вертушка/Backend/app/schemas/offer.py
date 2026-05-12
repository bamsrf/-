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
    url: str = Field(..., description="Partner-wrapped URL if affiliate present, else direct")
    status: str
    last_seen_at: datetime
