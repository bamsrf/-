"""
Модель магазина-источника предложений (РФ-ритейлеры винила).
"""
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import String, DateTime, Integer, Text, Numeric, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB

from app.database import Base


class Store(Base):
    """Магазин винила, чей каталог парсим."""

    __tablename__ = "stores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    slug: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    domain: Mapped[str] = mapped_column(String(255), nullable=False)
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    parser_class: Mapped[str] = mapped_column(String(128), nullable=False)

    logo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    rating: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False, server_default="0")

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    requires_browser: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    last_successful_scrape_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    total_listings: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    avg_shipping_rub: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    affiliate_program: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    listings = relationship("StoreListing", back_populates="store", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Store {self.slug}>"
