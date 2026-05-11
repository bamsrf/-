"""Система ачивок Вертушки.

Phase 0: каркас registry + evaluator + 10 ачивок (см. PLAN_ACHIEVEMENTS_V2.md §10).
Точка входа — emit_event(db, user_id, event, payload).
"""
from app.services.achievements.evaluator import emit_event
from app.services.achievements.registry import (
    AchievementDefinition,
    AchievementTier,
    EvalResult,
    get_definition,
    get_definitions_for_event,
    all_definitions,
)

__all__ = [
    "emit_event",
    "AchievementDefinition",
    "AchievementTier",
    "EvalResult",
    "get_definition",
    "get_definitions_for_event",
    "all_definitions",
]
