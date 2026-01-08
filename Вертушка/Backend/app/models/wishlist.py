"""
Модели вишлиста (списка желаемых пластинок)
"""
import uuid
import secrets
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Text, Integer, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


def generate_share_token() -> str:
    """Генерация уникального токена для публичной ссылки"""
    return secrets.token_urlsafe(16)


class Wishlist(Base):
    """Модель вишлиста пользователя"""
    
    __tablename__ = "wishlists"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Владелец вишлиста
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # У пользователя один вишлист
        index=True
    )
    
    # Публичный доступ
    share_token: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        nullable=False,
        default=generate_share_token,
        index=True
    )
    is_public: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    
    # Настройки отображения
    show_gifter_names: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )
    custom_message: Mapped[str | None] = mapped_column(
        Text,
        nullable=True  # Сообщение для дарителей
    )
    
    # Временные метки
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )
    
    # Отношения
    user = relationship("User", back_populates="wishlist")
    items = relationship(
        "WishlistItem",
        back_populates="wishlist",
        cascade="all, delete-orphan",
        order_by="WishlistItem.priority.desc(), WishlistItem.added_at.desc()"
    )
    
    def regenerate_share_token(self) -> str:
        """Перегенерация токена публичной ссылки"""
        self.share_token = generate_share_token()
        return self.share_token
    
    def __repr__(self) -> str:
        return f"<Wishlist {self.id}>"


class WishlistItem(Base):
    """Элемент вишлиста"""
    
    __tablename__ = "wishlist_items"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Связи
    wishlist_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("wishlists.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("records.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Приоритет (для сортировки)
    priority: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False
    )
    
    # Заметки от пользователя
    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )
    
    # Статус
    is_purchased: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False
    )
    
    # Временные метки
    added_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    purchased_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )
    
    # Отношения
    wishlist = relationship("Wishlist", back_populates="items")
    record = relationship("Record", back_populates="wishlist_items")
    gift_booking = relationship(
        "GiftBooking",
        back_populates="wishlist_item",
        uselist=False,
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<WishlistItem {self.id}>"

