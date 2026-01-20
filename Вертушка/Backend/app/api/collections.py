"""
API для работы с коллекциями
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.record import Record
from app.models.collection import Collection, CollectionItem
from app.api.auth import get_current_user
from app.schemas.collection import (
    CollectionCreate,
    CollectionUpdate,
    CollectionResponse,
    CollectionItemCreate,
    CollectionItemUpdate,
    CollectionItemResponse,
    CollectionWithItems,
    CollectionStats,
)

router = APIRouter()


@router.get("/", response_model=list[CollectionResponse])
async def get_collections(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получение списка коллекций пользователя"""
    result = await db.execute(
        select(Collection)
        .where(Collection.user_id == current_user.id)
        .order_by(Collection.sort_order, Collection.created_at)
    )
    collections = result.scalars().all()
    
    # Подсчёт элементов в каждой коллекции
    response = []
    for collection in collections:
        count_result = await db.execute(
            select(func.count(CollectionItem.id))
            .where(CollectionItem.collection_id == collection.id)
        )
        items_count = count_result.scalar()
        
        response.append(CollectionResponse(
            id=collection.id,
            user_id=collection.user_id,
            name=collection.name,
            description=collection.description,
            sort_order=collection.sort_order,
            created_at=collection.created_at,
            updated_at=collection.updated_at,
            items_count=items_count or 0
        ))
    
    return response


@router.post("/", response_model=CollectionResponse, status_code=status.HTTP_201_CREATED)
async def create_collection(
    data: CollectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Создание новой коллекции"""
    # Получаем максимальный sort_order
    result = await db.execute(
        select(func.max(Collection.sort_order))
        .where(Collection.user_id == current_user.id)
    )
    max_order = result.scalar() or 0
    
    collection = Collection(
        user_id=current_user.id,
        name=data.name,
        description=data.description,
        sort_order=max_order + 1
    )
    db.add(collection)
    await db.commit()
    await db.refresh(collection)
    
    return CollectionResponse(
        id=collection.id,
        user_id=collection.user_id,
        name=collection.name,
        description=collection.description,
        sort_order=collection.sort_order,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        items_count=0
    )


@router.get("/{collection_id}", response_model=CollectionWithItems)
async def get_collection(
    collection_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получение коллекции с элементами"""
    result = await db.execute(
        select(Collection)
        .where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Коллекция не найдена"
        )
    
    # Получаем элементы с пагинацией
    offset = (page - 1) * per_page
    items_result = await db.execute(
        select(CollectionItem)
        .where(CollectionItem.collection_id == collection_id)
        .options(selectinload(CollectionItem.record))
        .order_by(CollectionItem.added_at.desc())
        .offset(offset)
        .limit(per_page)
    )
    items = items_result.scalars().all()
    
    # Подсчёт общего количества
    count_result = await db.execute(
        select(func.count(CollectionItem.id))
        .where(CollectionItem.collection_id == collection_id)
    )
    items_count = count_result.scalar() or 0
    
    return CollectionWithItems(
        id=collection.id,
        user_id=collection.user_id,
        name=collection.name,
        description=collection.description,
        sort_order=collection.sort_order,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        items_count=items_count,
        items=[CollectionItemResponse(
            id=item.id,
            collection_id=item.collection_id,
            record_id=item.record_id,
            condition=item.condition,
            sleeve_condition=item.sleeve_condition,
            notes=item.notes,
            shelf_position=item.shelf_position,
            added_at=item.added_at,
            record=item.record
        ) for item in items]
    )


@router.put("/{collection_id}", response_model=CollectionResponse)
async def update_collection(
    collection_id: UUID,
    data: CollectionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновление коллекции"""
    result = await db.execute(
        select(Collection)
        .where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Коллекция не найдена"
        )
    
    if data.name is not None:
        collection.name = data.name
    if data.description is not None:
        collection.description = data.description
    
    await db.commit()
    await db.refresh(collection)
    
    # Подсчёт элементов
    count_result = await db.execute(
        select(func.count(CollectionItem.id))
        .where(CollectionItem.collection_id == collection_id)
    )
    items_count = count_result.scalar() or 0
    
    return CollectionResponse(
        id=collection.id,
        user_id=collection.user_id,
        name=collection.name,
        description=collection.description,
        sort_order=collection.sort_order,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
        items_count=items_count
    )


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_collection(
    collection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удаление коллекции"""
    result = await db.execute(
        select(Collection)
        .where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Коллекция не найдена"
        )
    
    await db.delete(collection)
    await db.commit()


@router.post("/{collection_id}/items", response_model=CollectionItemResponse, status_code=status.HTTP_201_CREATED)
async def add_record_to_collection(
    collection_id: UUID,
    data: CollectionItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Добавление пластинки в коллекцию"""
    from app.api.records import get_or_create_record_by_discogs_id
    
    # Проверяем коллекцию
    result = await db.execute(
        select(Collection)
        .where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id
        )
    )
    collection = result.scalar_one_or_none()
    
    if not collection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Коллекция не найдена"
        )
    
    # Получаем Record: либо по discogs_id, либо по record_id
    if data.discogs_id:
        record = await get_or_create_record_by_discogs_id(data.discogs_id, db)
    elif data.record_id:
        result = await db.execute(select(Record).where(Record.id == data.record_id))
        record = result.scalar_one_or_none()
        if not record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пластинка не найдена"
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Необходимо указать либо discogs_id, либо record_id"
        )

    # Проверяем, есть ли эта пластинка в вишлисте текущего пользователя
    from app.models.wishlist import Wishlist, WishlistItem

    wishlist_item_query = await db.execute(
        select(WishlistItem)
        .join(Wishlist)
        .where(
            Wishlist.user_id == current_user.id,
            WishlistItem.record_id == record.id
        )
    )
    wishlist_item = wishlist_item_query.scalar_one_or_none()

    # Если в вишлисте - автоматически удаляем (атомарный перенос)
    if wishlist_item:
        print(f"🔄 add_record_to_collection: removing from wishlist, item_id={wishlist_item.id}")
        await db.delete(wishlist_item)

    # Добавляем в коллекцию (дубликаты разрешены - можно иметь несколько копий одной пластинки)
    item = CollectionItem(
        collection_id=collection_id,
        record_id=record.id,
        condition=data.condition,
        sleeve_condition=data.sleeve_condition,
        notes=data.notes
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    return CollectionItemResponse(
        id=item.id,
        collection_id=item.collection_id,
        record_id=item.record_id,
        condition=item.condition,
        sleeve_condition=item.sleeve_condition,
        notes=item.notes,
        shelf_position=item.shelf_position,
        added_at=item.added_at,
        record=record
    )


@router.delete("/{collection_id}/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_record_from_collection(
    collection_id: UUID,
    record_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удаление пластинки из коллекции"""
    # Проверяем коллекцию
    result = await db.execute(
        select(Collection)
        .where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Коллекция не найдена"
        )
    
    # Находим и удаляем элемент (first() т.к. могут быть дубликаты)
    result = await db.execute(
        select(CollectionItem)
        .where(
            CollectionItem.collection_id == collection_id,
            CollectionItem.record_id == record_id
        )
    )
    item = result.scalars().first()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пластинка не найдена в коллекции"
        )
    
    await db.delete(item)
    await db.commit()


@router.delete("/{collection_id}/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_item_from_collection(
    collection_id: UUID,
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удаление конкретного элемента (копии) из коллекции по item_id"""
    # Проверяем коллекцию
    result = await db.execute(
        select(Collection)
        .where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Коллекция не найдена"
        )

    # Находим и удаляем конкретный элемент по item_id
    result = await db.execute(
        select(CollectionItem)
        .where(
            CollectionItem.id == item_id,
            CollectionItem.collection_id == collection_id
        )
    )
    item = result.scalar_one_or_none()

    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Элемент не найден в коллекции"
        )

    await db.delete(item)
    await db.commit()


@router.get("/{collection_id}/stats", response_model=CollectionStats)
async def get_collection_stats(
    collection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Статистика коллекции"""
    # Проверяем доступ
    result = await db.execute(
        select(Collection)
        .where(
            Collection.id == collection_id,
            Collection.user_id == current_user.id
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Коллекция не найдена"
        )
    
    # Получаем все пластинки коллекции
    result = await db.execute(
        select(CollectionItem)
        .where(CollectionItem.collection_id == collection_id)
        .options(selectinload(CollectionItem.record))
    )
    items = result.scalars().all()
    
    total_records = len(items)
    total_min = 0.0
    total_max = 0.0
    records_by_year = {}
    records_by_genre = {}
    years = []
    
    for item in items:
        record = item.record
        
        if record.estimated_price_min:
            total_min += float(record.estimated_price_min)
        if record.estimated_price_max:
            total_max += float(record.estimated_price_max)
        
        if record.year:
            years.append(record.year)
            records_by_year[record.year] = records_by_year.get(record.year, 0) + 1
        
        if record.genre:
            records_by_genre[record.genre] = records_by_genre.get(record.genre, 0) + 1
    
    return CollectionStats(
        total_records=total_records,
        total_estimated_value_min=total_min if total_min > 0 else None,
        total_estimated_value_max=total_max if total_max > 0 else None,
        records_by_year=records_by_year,
        records_by_genre=records_by_genre,
        oldest_record_year=min(years) if years else None,
        newest_record_year=max(years) if years else None
    )

