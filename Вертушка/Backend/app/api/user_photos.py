"""
API для пользовательских фото пластинок в коллекции.

POST   /api/collections/{collection_id}/items/{item_id}/photos
DELETE /api/collections/{collection_id}/items/{item_id}/photos/{photo_id}
PATCH  /api/collections/{collection_id}/items/{item_id}/photos/{photo_id}
"""
import logging
import os
import uuid
from io import BytesIO
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.auth import get_current_user
from app.database import get_db
from app.models.collection import Collection, CollectionItem
from app.models.user import User
from app.models.user_photo import UserRecordPhoto

logger = logging.getLogger(__name__)

router = APIRouter()

_MAX_SIDE = 800       # px — resize до 800px max side
_JPEG_QUALITY = 85
_MAX_FILE_MB = 10     # максимальный размер входящего файла
_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


class PhotoResponse(BaseModel):
    id: uuid.UUID
    collection_item_id: uuid.UUID
    photo_url: str
    is_primary: bool
    created_at: str

    model_config = {"from_attributes": True}


class PhotoPatchRequest(BaseModel):
    is_primary: bool


def _photo_dir(user_id: uuid.UUID) -> Path:
    return Path("uploads") / "user_photos" / str(user_id)


def _photo_path(user_id: uuid.UUID, photo_uuid: uuid.UUID) -> Path:
    return _photo_dir(user_id) / f"{photo_uuid}.jpg"


def _photo_url(user_id: uuid.UUID, photo_uuid: uuid.UUID) -> str:
    return f"/uploads/user_photos/{user_id}/{photo_uuid}.jpg"


async def _get_collection_item(
    collection_id: uuid.UUID,
    item_id: uuid.UUID,
    user: User,
    db: AsyncSession,
) -> CollectionItem:
    """Проверяет принадлежность item коллекции текущего пользователя."""
    result = await db.execute(
        select(Collection).where(
            Collection.id == collection_id,
            Collection.user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Коллекция не найдена")

    result = await db.execute(
        select(CollectionItem).where(
            CollectionItem.id == item_id,
            CollectionItem.collection_id == collection_id,
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Элемент не найден")

    return item


@router.post(
    "/{collection_id}/items/{item_id}/photos",
    response_model=PhotoResponse,
    status_code=status.HTTP_201_CREATED,
)
async def upload_photo(
    collection_id: uuid.UUID,
    item_id: uuid.UUID,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PhotoResponse:
    """
    Загрузить фото пластинки. Принимает JPEG/PNG/WebP, resize до 800px, сохраняет как JPEG.
    """
    from PIL import Image

    if file.content_type not in _ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Неподдерживаемый тип файла: {file.content_type}. Разрешены: JPEG, PNG, WebP",
        )

    raw = await file.read()
    if len(raw) > _MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Файл слишком большой. Максимум {_MAX_FILE_MB} МБ",
        )

    await _get_collection_item(collection_id, item_id, current_user, db)

    # Конвертация через Pillow
    try:
        img = Image.open(BytesIO(raw)).convert("RGB")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Не удалось прочитать изображение",
        )

    if img.width > _MAX_SIDE or img.height > _MAX_SIDE:
        img.thumbnail((_MAX_SIDE, _MAX_SIDE), Image.LANCZOS)

    photo_uuid = uuid.uuid4()
    photo_dir = _photo_dir(current_user.id)
    photo_dir.mkdir(parents=True, exist_ok=True)
    dest = _photo_path(current_user.id, photo_uuid)

    # Атомарная запись через tmp
    tmp_path = photo_dir / f".tmp_{photo_uuid}.jpg"
    try:
        img.save(tmp_path, format="JPEG", quality=_JPEG_QUALITY, optimize=True)
        os.rename(tmp_path, dest)
    except Exception as exc:
        logger.error("user_photos: failed to save %s: %s", dest, exc)
        if tmp_path.exists():
            tmp_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Не удалось сохранить файл")

    rel_path = f"user_photos/{current_user.id}/{photo_uuid}.jpg"

    photo = UserRecordPhoto(
        id=photo_uuid,
        user_id=current_user.id,
        collection_item_id=item_id,
        photo_path=rel_path,
        is_primary=False,
    )
    db.add(photo)
    await db.commit()
    await db.refresh(photo)

    return PhotoResponse(
        id=photo.id,
        collection_item_id=photo.collection_item_id,
        photo_url=_photo_url(current_user.id, photo_uuid),
        is_primary=photo.is_primary,
        created_at=photo.created_at.isoformat(),
    )


@router.delete(
    "/{collection_id}/items/{item_id}/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_photo(
    collection_id: uuid.UUID,
    item_id: uuid.UUID,
    photo_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Удалить фото."""
    await _get_collection_item(collection_id, item_id, current_user, db)

    result = await db.execute(
        select(UserRecordPhoto).where(
            UserRecordPhoto.id == photo_id,
            UserRecordPhoto.collection_item_id == item_id,
            UserRecordPhoto.user_id == current_user.id,
        )
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Фото не найдено")

    # Удаляем файл с диска
    file_path = Path("uploads") / photo.photo_path
    if file_path.exists():
        file_path.unlink(missing_ok=True)

    await db.delete(photo)
    await db.commit()


@router.patch(
    "/{collection_id}/items/{item_id}/photos/{photo_id}",
    response_model=PhotoResponse,
)
async def patch_photo(
    collection_id: uuid.UUID,
    item_id: uuid.UUID,
    photo_id: uuid.UUID,
    data: PhotoPatchRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PhotoResponse:
    """
    Обновить флаг is_primary.
    При установке is_primary=true сбрасывает флаг у остальных фото этого item.
    """
    await _get_collection_item(collection_id, item_id, current_user, db)

    result = await db.execute(
        select(UserRecordPhoto).where(
            UserRecordPhoto.id == photo_id,
            UserRecordPhoto.collection_item_id == item_id,
            UserRecordPhoto.user_id == current_user.id,
        )
    )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Фото не найдено")

    if data.is_primary:
        # Сбрасываем флаг у всех других фото этого item
        other_result = await db.execute(
            select(UserRecordPhoto).where(
                UserRecordPhoto.collection_item_id == item_id,
                UserRecordPhoto.id != photo_id,
                UserRecordPhoto.is_primary == True,  # noqa: E712
            )
        )
        for other in other_result.scalars().all():
            other.is_primary = False

    photo.is_primary = data.is_primary
    await db.commit()
    await db.refresh(photo)

    photo_uuid = photo.id
    return PhotoResponse(
        id=photo.id,
        collection_item_id=photo.collection_item_id,
        photo_url=_photo_url(current_user.id, photo_uuid),
        is_primary=photo.is_primary,
        created_at=photo.created_at.isoformat(),
    )
