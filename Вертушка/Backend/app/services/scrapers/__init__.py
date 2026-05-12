"""
Парсеры каталогов магазинов винила.

Импорт `app.services.scrapers.shops` авто-регистрирует все per-shop парсеры.
Чтобы добавить магазин: создаёшь `shops/<slug>.py` с классом-наследником
`BaseStoreParser` и декоратором `@register_parser("<slug>")`, импортируешь
файл в `shops/__init__.py`.
"""
from app.services.scrapers.base import (
    BaseStoreParser,
    ListingDTO,
    ParserError,
    ParserBlocked,
    ParserNeedsBrowser,
    TransientParserError,
)
from app.services.scrapers.registry import register_parser, get_parser, all_parsers

__all__ = [
    "BaseStoreParser",
    "ListingDTO",
    "ParserError",
    "ParserBlocked",
    "ParserNeedsBrowser",
    "TransientParserError",
    "register_parser",
    "get_parser",
    "all_parsers",
]
