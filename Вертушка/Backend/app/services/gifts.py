"""
Сервис подарочного флоу: единый путь завершения брони (complete).

Объединяет логику, ранее раздельно реализованную в:
- PUT /api/gifts/me/received/{id}/complete  (ставил только статус)
- POST /api/wishlists/items/{id}/move-to-collection  (создавал CollectionItem + email)

Теперь оба эндпоинта зовут complete_gift_booking().
"""
import logging
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.collection import Collection, CollectionItem
from app.models.gift_booking import GiftBooking, GiftStatus
from app.models.user import User
from app.models.wishlist import WishlistItem

logger = logging.getLogger(__name__)


async def get_or_create_default_collection(user: User, db: AsyncSession) -> Collection:
    """
    Возвращает первую коллекцию пользователя по порядку сортировки.
    Если коллекций нет — создаёт «Моя коллекция».
    """
    result = await db.execute(
        select(Collection)
        .where(Collection.user_id == user.id)
        .order_by(Collection.sort_order.asc(), Collection.created_at.asc())
        .limit(1)
    )
    collection = result.scalar_one_or_none()
    if collection is None:
        collection = Collection(user_id=user.id, name="Моя коллекция")
        db.add(collection)
        await db.flush()
    return collection


async def complete_gift_booking(
    booking: GiftBooking,
    owner: User,
    db: AsyncSession,
    *,
    collection: Collection | None = None,
    send_email: bool = True,
) -> CollectionItem:
    """
    Атомарно завершает бронь подарка:
      1. wishlist_item удаляется из вишлиста (record сохраняется)
      2. CollectionItem добавляется в указанную/дефолтную коллекцию владельца
      3. Бронь переводится в COMPLETED, completed_at, wishlist_item_id обнуляется
      4. Дарителю уходит письмо «подарок получен»

    Caller обязан загрузить booking с eager-load:
        selectinload(GiftBooking.wishlist_item).selectinload(WishlistItem.record)

    Не коммитит транзакцию — это делает caller (для согласования с другими
    операциями в том же запросе). Email отправляется уже после commit самим caller'ом.
    """
    item: WishlistItem | None = booking.wishlist_item
    if item is None:
        raise ValueError("complete_gift_booking: booking без wishlist_item (возможно уже COMPLETED)")

    record = item.record  # сохраняем до удаления

    target_collection = collection or await get_or_create_default_collection(owner, db)

    # Создаём элемент коллекции
    collection_item = CollectionItem(
        collection_id=target_collection.id,
        record_id=item.record_id,
    )
    db.add(collection_item)

    # Бронь — COMPLETED, отвязываем от wishlist_item
    booking.status = GiftStatus.COMPLETED
    booking.completed_at = datetime.utcnow()
    booking.wishlist_item_id = None

    # Удаляем сам пункт вишлиста (поведение симметрично move-to-collection)
    await db.delete(item)
    await db.flush()

    logger.info(
        "gift_completed",
        extra={
            "booking_id": str(booking.id),
            "collection_id": str(target_collection.id),
            "record_id": str(collection_item.record_id),
        },
    )

    # Запоминаем поля для письма (booking останется в сессии, но email отправит caller)
    if send_email and booking.gifter_email:
        gifter_email = booking.gifter_email
        gifter_name = booking.gifter_name
        record_title = record.title
        owner_name = owner.display_name or owner.username
        # Сохраняем для caller'а через атрибуты — простой контракт без лишних кортежей
        collection_item._pending_gift_email = {  # type: ignore[attr-defined]
            "gifter_email": gifter_email,
            "gifter_name": gifter_name,
            "record_title": record_title,
            "owner_name": owner_name,
        }

    return collection_item


async def send_pending_gift_email(collection_item: CollectionItem) -> None:
    """
    Отправляет письмо дарителю, если оно отложено на CollectionItem (см. complete_gift_booking).
    Вызывается caller'ом ПОСЛЕ commit, чтобы не блокировать ответ при ошибках SMTP.
    """
    payload = getattr(collection_item, "_pending_gift_email", None)
    if not payload:
        return
    try:
        from app.services.notifications import send_gift_received_to_gifter
        await send_gift_received_to_gifter(**payload)
    except Exception as exc:
        logger.warning(f"Не удалось отправить письмо дарителю: {exc}")
