"""Фоновые задачи системы ачивок.

Phase 0 — одна задача: daily_tick. Прогоняет evaluator-ы, которые зависят от
времени (например, R_thirty_three с 24h cooldown, B1/B2 с антифарм-задержкой
24h), для всех активных пользователей.

Реализовано «лениво» — итерируемся по пользователям, у которых есть хотя бы
одна запись в коллекции; пропускаем тех, у кого ВСЕ ачивки в зоне daily_tick
уже разблокированы.
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from app.database import async_session_maker
from app.models.collection import Collection
from app.models.user import User
from app.services.achievements import emit_event
from app.services.achievements.events import DAILY_TICK
from app.services.achievements.registry import (
    AchievementDefinition,
    all_definitions,
)

logger = logging.getLogger(__name__)


def _daily_tick_codes() -> set[str]:
    return {d.code for d in all_definitions() if DAILY_TICK in d.triggers}


async def daily_tick_achievements() -> None:
    """Фоновая задача. Запускается раз в сутки через APScheduler.

    Идёт по всем пользователям с непустой коллекцией и прогоняет emit_event(
    DAILY_TICK). Идемпотентность гарантируется ядром.
    """
    codes_to_check = _daily_tick_codes()
    if not codes_to_check:
        logger.info("achievements_daily_tick_skipped: no codes registered")
        return

    processed = 0
    failed = 0

    async with async_session_maker() as db:
        # Берём id пользователей, у которых есть хотя бы одна коллекция
        result = await db.execute(
            select(User.id)
            .join(Collection, Collection.user_id == User.id)
            .where(User.is_active.is_(True))
            .distinct()
        )
        user_ids = [row[0] for row in result.all()]

    logger.info(
        "achievements_daily_tick_start",
        extra={"total_users": len(user_ids), "codes": sorted(codes_to_check)},
    )

    for user_id in user_ids:
        try:
            # Каждый юзер — в своей сессии: ошибка одного не валит остальных.
            async with async_session_maker() as db:
                await emit_event(db, user_id, DAILY_TICK, {})
            processed += 1
        except SQLAlchemyError:
            failed += 1
            logger.exception(
                "achievements_daily_tick_user_failed",
                extra={"user_id": str(user_id)},
            )
        except Exception:  # noqa: BLE001
            failed += 1
            logger.exception(
                "achievements_daily_tick_user_unexpected",
                extra={"user_id": str(user_id)},
            )

    logger.info(
        "achievements_daily_tick_done",
        extra={"processed": processed, "failed": failed},
    )
