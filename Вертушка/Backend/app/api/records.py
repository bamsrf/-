"""
API для работы с пластинками
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.models.record import Record
from app.api.auth import get_current_user, get_current_user_optional
from app.schemas.record import (
    RecordCreate,
    RecordResponse,
    RecordSearchResult,
    RecordSearchResponse,
)
from app.services.discogs import DiscogsService

router = APIRouter()


async def get_or_create_record_by_discogs_id(
    discogs_id: str,
    db: AsyncSession
) -> Record:
    """
    Найти или создать Record по discogs_id.
    Используется в других endpoints для получения Record перед добавлением в коллекцию/вишлист.
    """
    # Проверяем локальную БД
    result = await db.execute(
        select(Record).where(Record.discogs_id == discogs_id)
    )
    record = result.scalar_one_or_none()
    
    if record:
        return record
    
    # Запрос в Discogs
    discogs = DiscogsService()
    
    try:
        record_data = await discogs.get_release(discogs_id)
        
        # Создаём запись в БД
        record = Record(
            discogs_id=record_data.get("id"),
            discogs_master_id=record_data.get("master_id"),
            title=record_data.get("title", "Unknown"),
            artist=record_data.get("artist", "Unknown"),
            label=record_data.get("label"),
            catalog_number=record_data.get("catalog_number"),
            year=record_data.get("year"),
            country=record_data.get("country"),
            genre=record_data.get("genre"),
            style=record_data.get("style"),
            format_type=record_data.get("format"),
            barcode=record_data.get("barcode"),
            cover_image_url=record_data.get("cover_image"),
            thumb_image_url=record_data.get("thumb_image"),
            estimated_price_min=record_data.get("price_min"),
            estimated_price_max=record_data.get("price_max"),
            estimated_price_median=record_data.get("price_median"),
            discogs_data=record_data,
            tracklist=record_data.get("tracklist"),
        )
        
        db.add(record)
        await db.commit()
        await db.refresh(record)
        
        return record
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при получении данных из Discogs: {str(e)}"
        )


@router.get("/search", response_model=RecordSearchResponse)
async def search_records(
    q: str = Query(..., min_length=1, description="Поисковый запрос"),
    artist: str | None = Query(None, description="Фильтр по артисту"),
    year: int | None = Query(None, description="Фильтр по году"),
    label: str | None = Query(None, description="Фильтр по лейблу"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    per_page: int = Query(20, ge=1, le=100, description="Записей на страницу"),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Поиск пластинок в Discogs.
    Не требует авторизации, но с авторизацией может сохранять историю.
    """
    discogs = DiscogsService()
    
    try:
        results = await discogs.search(
            query=q,
            artist=artist,
            year=year,
            label=label,
            page=page,
            per_page=per_page
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при поиске в Discogs: {str(e)}"
        )


@router.post("/scan/barcode", response_model=list[RecordSearchResult])
async def scan_barcode(
    barcode: str = Query(..., min_length=8, max_length=20, description="Штрихкод"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Поиск пластинки по штрихкоду.
    Требует авторизации.
    """
    # Сначала проверяем локальную БД
    result = await db.execute(
        select(Record).where(Record.barcode == barcode)
    )
    local_record = result.scalar_one_or_none()
    
    if local_record:
        return [RecordSearchResult(
            discogs_id=local_record.discogs_id or "",
            title=local_record.title,
            artist=local_record.artist,
            label=local_record.label,
            year=local_record.year,
            country=local_record.country,
            cover_image_url=local_record.cover_image_url,
            thumb_image_url=local_record.thumb_image_url,
            format_type=local_record.format_type,
        )]
    
    # Поиск в Discogs
    discogs = DiscogsService()
    
    try:
        results = await discogs.search_by_barcode(barcode)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при поиске по штрихкоду: {str(e)}"
        )


@router.get("/{record_id}", response_model=RecordResponse)
async def get_record(
    record_id: UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Получение информации о пластинке"""
    result = await db.execute(select(Record).where(Record.id == record_id))
    record = result.scalar_one_or_none()
    
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пластинка не найдена"
        )
    
    return record


@router.get("/discogs/{discogs_id}", response_model=RecordResponse)
async def get_record_by_discogs_id(
    discogs_id: str,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение информации о пластинке по Discogs ID.
    Если пластинка не найдена в локальной БД, запрашивает Discogs и сохраняет.
    """
    # Проверяем локальную БД
    result = await db.execute(
        select(Record).where(Record.discogs_id == discogs_id)
    )
    record = result.scalar_one_or_none()
    
    if record:
        return record
    
    # Запрос в Discogs
    discogs = DiscogsService()
    
    try:
        record_data = await discogs.get_release(discogs_id)
        
        # Создаём запись в БД
        record = Record(
            discogs_id=record_data.get("id"),
            discogs_master_id=record_data.get("master_id"),
            title=record_data.get("title", "Unknown"),
            artist=record_data.get("artist", "Unknown"),
            label=record_data.get("label"),
            catalog_number=record_data.get("catalog_number"),
            year=record_data.get("year"),
            country=record_data.get("country"),
            genre=record_data.get("genre"),
            style=record_data.get("style"),
            format_type=record_data.get("format"),
            barcode=record_data.get("barcode"),
            cover_image_url=record_data.get("cover_image"),
            thumb_image_url=record_data.get("thumb_image"),
            estimated_price_min=record_data.get("price_min"),
            estimated_price_max=record_data.get("price_max"),
            estimated_price_median=record_data.get("price_median"),
            discogs_data=record_data,
            tracklist=record_data.get("tracklist"),
        )
        
        db.add(record)
        await db.commit()
        await db.refresh(record)
        
        return record
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при получении данных из Discogs: {str(e)}"
        )


@router.post("/", response_model=RecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record(
    record_data: RecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Создание пластинки вручную (без Discogs).
    Требует авторизации.
    """
    record = Record(**record_data.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)
    
    return record

