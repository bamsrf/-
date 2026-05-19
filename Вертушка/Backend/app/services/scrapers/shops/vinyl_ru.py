"""
Парсер Vinyl.ru — большой РФ-магазин винила и **смежных форматов**:
LP, 2LP/3LP/4LP, CD, 2CD, Box Set, LP+CD, EP, 7", Maxi Single, Подарочные наборы.
Каталог ~64 500 товаров (по состоянию на 2026-05-19), не только vinyl.

Особенности:
- Bitrix CMS, sitemap-index `/sitemap.xml` → `sitemap_part_detail.xml` со всеми
  товарами (URL `/catalog/item/{slug}-{ID}/`).
- Title очень структурированный: «Виниловая пластинка {Artist} - альбом {Album},
  цена {Price} ₽. , лейбл {Label}, формат {Format}». Префикс «Виниловая пластинка»
  для ВСЕХ товаров (даже CD/cassette) — это маркетинговый шаблон Bitrix, реальный
  формат в поле «формат».
- **Нет barcode/EAN/каталога** на странице — matcher для этих листингов идёт через
  artist+title Discogs fetch (шаг 5b в listing_matcher).
- In-stock detect: наличие `class="js_add2basket"` или `class="available-text"`
  в HTML. У out-of-stock эти классы убраны (но цена остаётся для информации).
- Цена в `class="price_current"` или fallback из title.
- Год выпуска: «Год выпуска пластинки: {YYYY}» в тексте товарной страницы.
- Обложка: og:image (CDN vinyl.ru/upload/resizeImg/...).
"""
from __future__ import annotations

import logging
import re
from decimal import Decimal

from bs4 import BeautifulSoup

from app.services.scrapers.base import BaseStoreParser, ListingDTO, ParserError
from app.services.scrapers.extractors import (
    parse_price,
    parse_year,
    infer_format,
    infer_vinyl_color,
)
from app.services.scrapers.registry import register_parser

logger = logging.getLogger(__name__)


# URL: /catalog/item/{slug}-{ID}/  где ID формата «00-00000372»
_URL_ID_RE = re.compile(r"/catalog/item/[^/]*?-(\d{2}-\d{8})/?$")

# Title regex: «Виниловая пластинка {Artist} - альбом {Album}, цена {N} ₽. , лейбл {Label}, формат {Format}»
# Берём через жадные/нежадные группы — между разделителями « - альбом », «, цена », «, лейбл », «, формат ».
_TITLE_RE = re.compile(
    r"Виниловая\s+пластинка\s+(?P<artist>.+?)\s*[-–—]\s*альбом\s+(?P<album>[^,]+?)"
    r"(?:\s*,\s*цена\s+(?P<price>[\d\s ]+)\s*[₽])?"
    r"(?:\s*\.\s*,?\s*лейбл\s+(?P<label>[^,]+?))?"
    r"(?:\s*,\s*формат\s+(?P<format>\S+))?",
    re.IGNORECASE,
)

# In-stock сигналы Bitrix: класс кнопки или текст «available»
_IN_STOCK_RE = re.compile(r"class=\"[^\"]*js_add2basket[^\"]*\"|class=\"[^\"]*available-text[^\"]*\"", re.I)
_PREORDER_KW_RE = re.compile(r"предзаказ|pre[\s\-]?order", re.I)

# Год выпуска: «Год выпуска пластинки: 2014»
_YEAR_RELEASE_RE = re.compile(r"Год\s+выпуска\s+пластинки\s*:?\s*(\d{4})", re.I)

# Цена из HTML: <span class="price_current">5 000 ₽</span>
_PRICE_CURRENT_RE = re.compile(r'class="price_current"[^>]*>\s*([\d\s ]+)\s*[₽₽]', re.I)


@register_parser("vinyl_ru")
class VinylRuParser(BaseStoreParser):
    base_url = "https://vinyl.ru"
    rate_limit_per_sec = 0.5  # 1 req per 2s — Bitrix-сайт средней нагрузки
    rate_burst = 2
    requires_js = False
    # У vinyl.ru sitemap-индекс ссылается на sitemap_part_detail.xml — он содержит
    # все товары /catalog/item/. iter_sitemap_urls автоматически развернёт индекс.
    sitemap_paths = ["/sitemap.xml"]
    listing_url_pattern = r"/catalog/item/.+-\d{2}-\d{8}/?$"

    @property
    def slug(self) -> str:
        return "vinyl_ru"

    async def parse_listing(self, url: str) -> ListingDTO:
        html = await self.http.get_text(url)
        soup = BeautifulSoup(html, "lxml")

        external_id = _extract_id_from_url(url)
        if not external_id:
            raise ParserError(f"no external_id in URL {url}")

        # === Title parse ===
        title_tag = soup.title.get_text(strip=True) if soup.title else ""
        og_title = _meta_content(soup, "og:title", attr="property") or ""

        m = _TITLE_RE.search(title_tag)
        artist = album = label = format_from_title = None
        price_from_title = None
        if m:
            artist = m.group("artist").strip()
            album = m.group("album").strip()
            label = (m.group("label") or "").strip() or None
            format_from_title = (m.group("format") or "").strip() or None
            price_str = m.group("price")
            if price_str:
                price_from_title = parse_price(price_str.replace(" ", " "))

        # Fallback на og:title если main regex не сработал
        if not album and og_title:
            if " - " in og_title:
                artist, album = og_title.split(" - ", 1)
            else:
                album = og_title
        if not album:
            raise ParserError(f"no title at {url}")

        # === Price ===
        # Приоритет: HTML class="price_current" > title > None.
        price = None
        pm = _PRICE_CURRENT_RE.search(html)
        if pm:
            price = parse_price(pm.group(1).replace(" ", " "))
        if price is None:
            price = price_from_title

        # === Year ===
        # Берём первый «Год выпуска пластинки» — на странице может быть и «Год релиза
        # альбома» (год оригинального релиза мастера), но нам нужен год пресса.
        year = None
        ym = _YEAR_RELEASE_RE.search(html)
        if ym:
            try:
                year = int(ym.group(1))
            except ValueError:
                year = None
        if year is None:
            year = parse_year(title_tag)

        # === Format ===
        # Приоритет: явное поле «формат X» из title, нормализованное через
        # infer_format (чтобы «Box»→«Box Set», «2lp»→«2xLP», и т.п. — для
        # консистентности с другими магазинами). Если infer_format ничего не
        # узнал в format_from_title — оставляем raw. Fallback на infer_format
        # по всему HTML, дефолт — «LP» для vinyl-магазина.
        full_text = f"{title_tag}\n{format_from_title or ''}\n{html[:5000]}"
        format_raw = (
            (infer_format(format_from_title) if format_from_title else None)
            or format_from_title
            or infer_format(full_text)
            or "LP"
        )

        # === Vinyl color ===
        vinyl_color = infer_vinyl_color(title_tag) or infer_vinyl_color(html[:5000])

        # === Status ===
        if _PREORDER_KW_RE.search(title_tag):
            status = "preorder"
        elif _IN_STOCK_RE.search(html):
            status = "in_stock"
        elif price is None:
            status = "on_request"
        else:
            # Цена есть но кнопки «купить» нет → out_of_stock (Bitrix отображает
            # цену для архивных товаров справочно)
            status = "out_of_stock"

        # === Cover ===
        cover = _meta_content(soup, "og:image", attr="property")

        return ListingDTO(
            external_id=external_id,
            url=url,
            title_raw=album,
            artist_raw=artist,
            year_raw=year,
            format_raw=format_raw,
            vinyl_color_raw=vinyl_color,
            condition=None,
            price_rub=price,
            price_currency="RUB",
            status=status,
            # Vinyl.ru не публикует barcode/catalog/Discogs-ссылки.
            # Matcher пойдёт через _try_discogs_fetch_by_text (artist+title).
            barcode=None,
            catalog_number=None,
            discogs_release_url=None,
            image_url=cover,
            raw_payload={
                "vinyl_ru_external_id": external_id,
                "vinyl_ru_label": label,
            },
        )


# ---- helpers ----------------------------------------------------------- #


def _extract_id_from_url(url: str) -> str | None:
    m = _URL_ID_RE.search(url)
    return m.group(1) if m else None


def _meta_content(soup: BeautifulSoup, key: str, *, attr: str = "name") -> str | None:
    el = soup.find("meta", attrs={attr: key})
    return el.get("content") if el and el.get("content") else None
