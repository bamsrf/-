"""
API endpoints для обложек виниловых пластинок.

GET /covers/{discogs_id}  — вызывается ТОЛЬКО через nginx @covers_fallback
                            когда файл на диске не найден.
POST /covers/{discogs_id}/refresh — принудительное обновление обложки.
                                    Требует X-Internal-Token.
"""
import asyncio
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, Header, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.models.record import Record
from app.services.cover_storage import CoverStorageService, _download_cover_background

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Обложки"])


@router.get("/{discogs_id}")
async def get_cover(
    discogs_id: str,
    db: AsyncSession = Depends(get_db),
) -> RedirectResponse:
    """
    Вызывается nginx @covers_fallback когда файл не найден на диске.

    Если запись есть в БД — запускаем фоновое скачивание и возвращаем
    302 redirect на оригинальный Discogs URL (signed URL из БД).
    """
    result = await db.execute(
        select(Record.discogs_id, Record.cover_image_url, Record.cover_local_path)
        .where(Record.discogs_id == discogs_id)
    )
    record = result.first()

    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")

    # Запускаем фоновое скачивание если обложки нет локально
    if not record.cover_local_path and record.cover_image_url:
        asyncio.create_task(_download_cover_background(discogs_id, record.cover_image_url))

    if not record.cover_image_url:
        raise HTTPException(status_code=404, detail="Cover image not available")

    # 302 redirect — клиент получит обложку немедленно через Discogs URL
    return RedirectResponse(url=record.cover_image_url, status_code=302)


@router.post("/{discogs_id}/refresh", status_code=200)
async def refresh_cover(
    discogs_id: str,
    x_internal_token: str = Header(alias="X-Internal-Token"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Принудительно перекачивает обложку из Discogs.
    Требует заголовок X-Internal-Token.
    """
    settings = get_settings()
    if not settings.internal_api_token or x_internal_token != settings.internal_api_token:
        raise HTTPException(status_code=403, detail="Invalid token")

    result = await db.execute(
        select(Record).where(Record.discogs_id == discogs_id)
    )
    record = result.scalar_one_or_none()

    if record is None:
        raise HTTPException(status_code=404, detail="Record not found")

    if not record.cover_image_url:
        raise HTTPException(status_code=422, detail="No source cover URL in DB")

    service = CoverStorageService()

    # Удалить старый файл если есть
    if record.cover_local_path:
        old_path = Path("uploads") / record.cover_local_path
        if old_path.exists():
            old_path.unlink(missing_ok=True)

    # Скачать заново (cover_cached_at обновится внутри)
    rel_path = await service.download_and_store(discogs_id, record.cover_image_url, db)

    return {
        "discogs_id": discogs_id,
        "cover_local_path": rel_path,
        "refreshed": rel_path is not None,
    }
