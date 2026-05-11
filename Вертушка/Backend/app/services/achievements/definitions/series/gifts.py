"""Серия «Дарящая рука» (J*).

Phase 0 содержит J1.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy import select, exists
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.gift_booking import GiftBooking, GiftStatus
from app.services.achievements.events import GIFT_BOOKED
from app.services.achievements.registry import (
    AchievementDefinition,
    AchievementTier,
    EvalResult,
)


J1_CODE = "J1_first_gift"


async def _evaluate_j1(
    db: AsyncSession,
    user_id: UUID,
    payload: dict[str, Any],
    unlocked_now: set[str],
) -> EvalResult:
    """Юзер забронировал хотя бы один подарок (booked, completed или pending —
    PENDING тоже считаем как «попробовал», т.к. ачивка про сам жест дарения).
    Только аутентифицированный бронь — booked_by_user_id IS NOT NULL.
    """
    has_booking = await db.scalar(
        select(
            exists().where(
                GiftBooking.booked_by_user_id == user_id,
                GiftBooking.status.in_(
                    [GiftStatus.PENDING, GiftStatus.BOOKED, GiftStatus.COMPLETED]
                ),
            )
        )
    )
    return EvalResult(unlocked=bool(has_booking))


DEFINITIONS: list[AchievementDefinition] = [
    AchievementDefinition(
        code=J1_CODE,
        title_ru="Подарил",
        description_ru="Забронируй первый подарок другу.",
        series="gifts",
        tier=AchievementTier.SIMPLE,
        is_hidden=False,
        triggers=(GIFT_BOOKED,),
        evaluator=_evaluate_j1,
        icon_slug="j1_first_gift",
    ),
]
