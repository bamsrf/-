"""
Per-shop парсеры.

Чтобы добавить магазин:
1. Создать `<slug>.py` с классом-наследником `BaseStoreParser` и декоратором
   `@register_parser("<slug>")`.
2. Добавить `from app.services.scrapers.shops import <slug>  # noqa` ниже.
3. В БД (или через Store-сидинг) создать запись `Store(slug="<slug>", parser_class="<slug>", ...)`.

Парсер автоматически попадёт в реестр и будет доступен через `get_parser("<slug>")`.

# --- Регистрация парсеров ---
"""

from app.services.scrapers.shops import korobkavinyla  # noqa: F401
