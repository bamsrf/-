"""
Схемы для аутентификации
"""
from uuid import UUID
from pydantic import BaseModel


class Token(BaseModel):
    """Токен доступа"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    """Payload JWT токена"""
    sub: UUID  # user_id
    exp: int   # expiration time
    type: str  # "access" или "refresh"


class RefreshToken(BaseModel):
    """Схема для обновления токена"""
    refresh_token: str


class AppleSignIn(BaseModel):
    """Схема для Apple Sign In"""
    identity_token: str
    authorization_code: str
    user_identifier: str
    email: str | None = None
    full_name: str | None = None


class GoogleSignIn(BaseModel):
    """Схема для Google Sign In"""
    id_token: str

