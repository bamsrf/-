"""
Фоновые задачи: ежедневный снапшот стоимости коллекций
"""
import logging
from datetime import date
from decimal import Decimal

from sqlalchemy import select, func
from sqlalchemy.dialects.postgresql import insert as pg_insert

from app.database import async_session_maker
from app.models.collection import Collection, CollectionItem
from app.models.collection_value_snapshot import CollectionValueSnapshot
from app.models.record import Record
from app.models.user import User
from app.services.exchange import get_usd_rub_rate

logger = logging.getLogger(__name__)


async def record_daily_snapshots():
    """
    Записывает дневной снапшот стоимости коллекции для каждого пользователя.
    UPSERT на (user_id, snapshot_date) — повторный запуск перетирает значение.
    """
    today = date.today()
    rate = await get_usd_rub_rate()

    async with async_session_maker() as db:
        try:
            # DISTINCT по record_id: пластинка может лежать в общей коллекции
            # и в папках одновременно — не дублируем её в снапшоте стоимости.
            dedup = (
                select(
                    Collection.user_id.label("user_id"),
                    CollectionItem.record_id.label("record_id"),
                    func.max(Record.estimated_price_median).label("price_usd"),
                )
                .select_from(Collection)
                .join(CollectionItem, CollectionItem.collection_id == Collection.id)
                .join(Record, Record.id == CollectionItem.record_id)
                .group_by(Collection.user_id, CollectionItem.record_id)
                .subquery()
            )
            stmt = (
                select(
                    dedup.c.user_id.label("user_id"),
                    func.coalesce(func.sum(dedup.c.price_usd), 0).label("value_usd"),
                    func.count(dedup.c.record_id).label("items_count"),
                )
                .group_by(dedup.c.user_id)
            )
            result = await db.execute(stmt)
            rows = result.all()

            for row in rows:
                value_rub = Decimal(str(float(row.value_usd or 0) * rate)).quantize(Decimal("0.01"))
                stmt_upsert = pg_insert(CollectionValueSnapshot).values(
                    user_id=row.user_id,
                    snapshot_date=today,
                    total_value_rub=value_rub,
                    items_count=row.items_count or 0,
                ).on_conflict_do_update(
                    index_elements=["user_id", "snapshot_date"],
                    set_={
                        "total_value_rub": value_rub,
                        "items_count": row.items_count or 0,
                    },
                )
                await db.execute(stmt_upsert)

            await db.commit()
            logger.info(f"Снапшоты стоимости записаны: {len(rows)} пользователей, дата={today}")
        except Exception as e:
            await db.rollback()
            logger.error(f"Ошибка в record_daily_snapshots: {e}")
