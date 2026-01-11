"""
API для работы с вишлистами
"""
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.user import User
from app.models.record import Record
from app.models.wishlist import Wishlist, WishlistItem
from app.models.gift_booking import GiftBooking
from app.api.auth import get_current_user, get_current_user_optional
from app.schemas.wishlist import (
    WishlistResponse,
    WishlistItemCreate,
    WishlistItemUpdate,
    WishlistItemResponse,
    WishlistPublicResponse,
    WishlistPublicItemResponse,
    GiftBookingInfo,
)
from app.schemas.record import RecordBrief

router = APIRouter()


@router.get("/", response_model=WishlistResponse)
async def get_my_wishlist(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Получение вишлиста текущего пользователя"""
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.user_id == current_user.id)
        .options(
            selectinload(Wishlist.items)
            .selectinload(WishlistItem.record),
            selectinload(Wishlist.items)
            .selectinload(WishlistItem.gift_booking)
        )
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        # Создаём вишлист если его нет
        wishlist = Wishlist(user_id=current_user.id)
        db.add(wishlist)
        await db.commit()
        await db.refresh(wishlist)
        wishlist.items = []
    
    return WishlistResponse(
        id=wishlist.id,
        user_id=wishlist.user_id,
        share_token=wishlist.share_token,
        is_public=wishlist.is_public,
        show_gifter_names=wishlist.show_gifter_names,
        custom_message=wishlist.custom_message,
        created_at=wishlist.created_at,
        updated_at=wishlist.updated_at,
        items=[WishlistItemResponse(
            id=item.id,
            wishlist_id=item.wishlist_id,
            record_id=item.record_id,
            priority=item.priority,
            notes=item.notes,
            is_purchased=item.is_purchased,
            added_at=item.added_at,
            purchased_at=item.purchased_at,
            record=item.record,
            gift_booking=GiftBookingInfo(
                id=item.gift_booking.id,
                gifter_name=item.gift_booking.gifter_name,
                status=item.gift_booking.status,
                booked_at=item.gift_booking.booked_at
            ) if item.gift_booking else None
        ) for item in wishlist.items]
    )


@router.post("/items", response_model=WishlistItemResponse, status_code=status.HTTP_201_CREATED)
async def add_to_wishlist(
    data: WishlistItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Добавление пластинки в вишлист"""
    from app.api.records import get_or_create_record_by_discogs_id
    
    # Получаем вишлист
    result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == current_user.id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        wishlist = Wishlist(user_id=current_user.id)
        db.add(wishlist)
        await db.flush()
    
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
    
    # Проверяем, не добавлена ли уже
    result = await db.execute(
        select(WishlistItem)
        .where(
            WishlistItem.wishlist_id == wishlist.id,
            WishlistItem.record_id == record.id
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пластинка уже в вишлисте"
        )
    
    # Добавляем
    item = WishlistItem(
        wishlist_id=wishlist.id,
        record_id=record.id,
        priority=data.priority,
        notes=data.notes
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    
    return WishlistItemResponse(
        id=item.id,
        wishlist_id=item.wishlist_id,
        record_id=item.record_id,
        priority=item.priority,
        notes=item.notes,
        is_purchased=item.is_purchased,
        added_at=item.added_at,
        purchased_at=item.purchased_at,
        record=record,
        gift_booking=None
    )


@router.put("/records/{item_id}", response_model=WishlistItemResponse)
async def update_wishlist_item(
    item_id: UUID,
    data: WishlistItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновление элемента вишлиста"""
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item_id)
        .options(
            selectinload(WishlistItem.wishlist),
            selectinload(WishlistItem.record),
            selectinload(WishlistItem.gift_booking)
        )
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Элемент не найден"
        )
    
    if item.wishlist.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа"
        )
    
    if data.priority is not None:
        item.priority = data.priority
    if data.notes is not None:
        item.notes = data.notes
    
    await db.commit()
    await db.refresh(item)
    
    return WishlistItemResponse(
        id=item.id,
        wishlist_id=item.wishlist_id,
        record_id=item.record_id,
        priority=item.priority,
        notes=item.notes,
        is_purchased=item.is_purchased,
        added_at=item.added_at,
        purchased_at=item.purchased_at,
        record=item.record,
        gift_booking=GiftBookingInfo(
            id=item.gift_booking.id,
            gifter_name=item.gift_booking.gifter_name,
            status=item.gift_booking.status,
            booked_at=item.gift_booking.booked_at
        ) if item.gift_booking else None
    )


@router.delete("/records/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_wishlist(
    item_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Удаление пластинки из вишлиста"""
    result = await db.execute(
        select(WishlistItem)
        .where(WishlistItem.id == item_id)
        .options(selectinload(WishlistItem.wishlist))
    )
    item = result.scalar_one_or_none()
    
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Элемент не найден"
        )
    
    if item.wishlist.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Нет доступа"
        )
    
    await db.delete(item)
    await db.commit()


@router.get("/share/{share_token}", response_model=WishlistPublicResponse)
async def get_public_wishlist(
    share_token: str,
    q: str | None = Query(None, description="Поиск по вишлисту"),
    db: AsyncSession = Depends(get_db)
):
    """
    Публичный доступ к вишлисту по токену.
    Не требует авторизации.
    """
    result = await db.execute(
        select(Wishlist)
        .where(
            Wishlist.share_token == share_token,
            Wishlist.is_public == True
        )
        .options(
            selectinload(Wishlist.user),
            selectinload(Wishlist.items)
            .selectinload(WishlistItem.record),
            selectinload(Wishlist.items)
            .selectinload(WishlistItem.gift_booking)
        )
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Вишлист не найден или недоступен"
        )
    
    # Фильтрация по поиску
    items = wishlist.items
    if q:
        q_lower = q.lower()
        items = [
            item for item in items
            if q_lower in item.record.title.lower() or q_lower in item.record.artist.lower()
        ]
    
    # Формируем публичный ответ
    public_items = []
    for item in items:
        if not item.is_purchased:  # Не показываем купленные
            is_booked = item.gift_booking is not None
            gifter_name = None
            if is_booked and wishlist.show_gifter_names:
                gifter_name = item.gift_booking.gifter_name
            
            public_items.append(WishlistPublicItemResponse(
                id=item.id,
                record=RecordBrief(
                    id=item.record.id,
                    title=item.record.title,
                    artist=item.record.artist,
                    year=item.record.year,
                    cover_image_url=item.record.cover_image_url,
                    thumb_image_url=item.record.thumb_image_url,
                    estimated_price_median=item.record.estimated_price_median,
                    price_currency=item.record.price_currency
                ),
                priority=item.priority,
                notes=item.notes,
                is_booked=is_booked,
                gifter_name=gifter_name
            ))
    
    # Сортируем по приоритету
    public_items.sort(key=lambda x: -x.priority)
    
    return WishlistPublicResponse(
        owner_name=wishlist.user.display_name or wishlist.user.username,
        owner_avatar=wishlist.user.avatar_url,
        custom_message=wishlist.custom_message,
        items=public_items,
        total_items=len(public_items)
    )


@router.post("/generate-link", response_model=dict)
async def generate_share_link(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Генерация новой ссылки для шаринга"""
    result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == current_user.id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        wishlist = Wishlist(user_id=current_user.id)
        db.add(wishlist)
    else:
        wishlist.regenerate_share_token()
    
    await db.commit()
    await db.refresh(wishlist)
    
    from app.config import get_settings
    settings = get_settings()
    
    return {
        "share_token": wishlist.share_token,
        "share_url": f"{settings.app_url}/wishlist/{wishlist.share_token}"
    }


@router.put("/settings")
async def update_wishlist_settings(
    is_public: bool | None = None,
    show_gifter_names: bool | None = None,
    custom_message: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Обновление настроек вишлиста"""
    result = await db.execute(
        select(Wishlist).where(Wishlist.user_id == current_user.id)
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Вишлист не найден"
        )
    
    if is_public is not None:
        wishlist.is_public = is_public
    if show_gifter_names is not None:
        wishlist.show_gifter_names = show_gifter_names
    if custom_message is not None:
        wishlist.custom_message = custom_message
    
    await db.commit()
    
    return {"status": "ok"}


@router.get("/search", response_model=list[WishlistItemResponse])
async def search_wishlist(
    q: str = Query(..., min_length=1, description="Поисковый запрос"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Поиск по своему вишлисту"""
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.user_id == current_user.id)
        .options(
            selectinload(Wishlist.items)
            .selectinload(WishlistItem.record),
            selectinload(Wishlist.items)
            .selectinload(WishlistItem.gift_booking)
        )
    )
    wishlist = result.scalar_one_or_none()
    
    if not wishlist:
        return []
    
    q_lower = q.lower()
    matching_items = [
        item for item in wishlist.items
        if q_lower in item.record.title.lower() or q_lower in item.record.artist.lower()
    ]
    
    return [WishlistItemResponse(
        id=item.id,
        wishlist_id=item.wishlist_id,
        record_id=item.record_id,
        priority=item.priority,
        notes=item.notes,
        is_purchased=item.is_purchased,
        added_at=item.added_at,
        purchased_at=item.purchased_at,
        record=item.record,
        gift_booking=GiftBookingInfo(
            id=item.gift_booking.id,
            gifter_name=item.gift_booking.gifter_name,
            status=item.gift_booking.status,
            booked_at=item.gift_booking.booked_at
        ) if item.gift_booking else None
    ) for item in matching_items]

