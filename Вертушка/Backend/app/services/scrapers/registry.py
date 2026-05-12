"""
Реестр парсеров магазинов.

Использование:
    @register_parser("plastinka_com")
    class PlastinkaComParser(BaseStoreParser):
        ...

В Store.parser_class храним slug; при инстанциации:
    cls = get_parser(store.parser_class)
    parser = cls(http=..., browser=...)
"""
from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.services.scrapers.base import BaseStoreParser


_REGISTRY: dict[str, type["BaseStoreParser"]] = {}


def register_parser(slug: str):
    """Декоратор регистрации парсера. Заодно проставляет cls.slug."""

    def decorator(cls: type["BaseStoreParser"]) -> type["BaseStoreParser"]:
        if slug in _REGISTRY and _REGISTRY[slug] is not cls:
            raise RuntimeError(f"Duplicate parser registration for slug={slug!r}")
        cls.slug = slug
        _REGISTRY[slug] = cls
        return cls

    return decorator


def get_parser(slug: str) -> type["BaseStoreParser"]:
    """Получить класс парсера по slug. KeyError если не зарегистрирован."""
    if slug not in _REGISTRY:
        raise KeyError(
            f"Unknown parser: {slug!r}. Зарегистрируй класс через "
            f"@register_parser({slug!r}) и убедись, что модуль импортирован "
            f"в app/services/scrapers/shops/__init__.py"
        )
    return _REGISTRY[slug]


def all_parsers() -> dict[str, type["BaseStoreParser"]]:
    """Снимок всех зарегистрированных парсеров (для debug/CLI)."""
    return dict(_REGISTRY)
