"""
Pydantic схемы для валидации данных
"""
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserResponse,
    UserUpdate,
    UserPublicResponse,
)
from app.schemas.record import (
    RecordCreate,
    RecordResponse,
    RecordSearchResult,
    RecordBrief,
)
from app.schemas.collection import (
    CollectionCreate,
    CollectionResponse,
    CollectionItemCreate,
    CollectionItemResponse,
    CollectionWithItems,
)
from app.schemas.wishlist import (
    WishlistResponse,
    WishlistItemCreate,
    WishlistItemResponse,
    WishlistPublicResponse,
    GiftBookingCreate,
    GiftBookingResponse,
)
from app.schemas.auth import (
    Token,
    TokenPayload,
    RefreshToken,
)

__all__ = [
    # User
    "UserCreate",
    "UserLogin",
    "UserResponse",
    "UserUpdate",
    "UserPublicResponse",
    # Record
    "RecordCreate",
    "RecordResponse",
    "RecordSearchResult",
    "RecordBrief",
    # Collection
    "CollectionCreate",
    "CollectionResponse",
    "CollectionItemCreate",
    "CollectionItemResponse",
    "CollectionWithItems",
    # Wishlist
    "WishlistResponse",
    "WishlistItemCreate",
    "WishlistItemResponse",
    "WishlistPublicResponse",
    "GiftBookingCreate",
    "GiftBookingResponse",
    # Auth
    "Token",
    "TokenPayload",
    "RefreshToken",
]

