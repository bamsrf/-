"""
Модель подписок между пользователями
"""
import uuid
from datetime import datetime
from sqlalchemy import DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class Follow(Base):
    """Модель подписки на пользователя"""
    
    __tablename__ = "follows"
    
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    
    # Кто подписался
    follower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # На кого подписались
    following_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Временная метка
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    
    # Уникальность пары follower-following
    __table_args__ = (
        UniqueConstraint(
            "follower_id",
            "following_id",
            name="unique_follow"
        ),
    )
    
    # Отношения
    follower = relationship(
        "User",
        foreign_keys=[follower_id],
        back_populates="following"
    )
    following = relationship(
        "User",
        foreign_keys=[following_id],
        back_populates="followers"
    )
    
    def __repr__(self) -> str:
        return f"<Follow {self.follower_id} -> {self.following_id}>"

