"""
Модель пользовательских фото виниловых пластинок
"""
import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class UserRecordPhoto(Base):
    """Пользовательское фото пластинки в коллекции"""

    __tablename__ = "user_record_photos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    collection_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("collection_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Путь относительно uploads/: "user_photos/{user_id}/{uuid}.jpg"
    photo_path: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    # Если True — показывать вместо обложки Discogs
    is_primary: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # Отношения
    user = relationship("User")
    collection_item = relationship("CollectionItem", back_populates="user_photos")

    def __repr__(self) -> str:
        return f"<UserRecordPhoto {self.id} item={self.collection_item_id}>"
