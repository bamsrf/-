"""
API для работы с пластинками
"""
import asyncio
import logging
from uuid import UUID

logger = logging.getLogger(__name__)

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, Query, Response
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.cache import cache, TTL_MASTER_VERSIONS

from app.database import get_db
from app.models.user import User
from app.models.record import Record
from app.api.auth import get_current_user, get_current_user_optional
from app.services.exchange import get_usd_rub_rate
from app.services.pricing import PricingParams, estimate_rub, effective_markup
from app.config import get_settings
from app.schemas.record import (
    RecordCreate,
    RecordResponse,
    RecordSearchResult,
    RecordSearchResponse,
    CoverScanRequest,
    CoverScanResponse,
    MasterSearchResponse,
    MasterRelease,
    MasterVersionsResponse,
    ReleaseSearchResponse,
    ArtistSearchResponse,
    Artist,
)
from app.services.discogs import DiscogsService
from app.services.rate_limiter import Priority
from app.services.artist_name import clean_artist_name
from app.services.openai_vision import OpenAIVisionService, CoverRecognitionError

router = APIRouter()


async def _enrich_search_results_with_rarity(
    items: list,
    db: AsyncSession,
    *,
    id_attr: str,
    format_attr: str,
) -> None:
    """
    Cheap rarity enrichment for search/release lists:
      - parses is_limited from format string token match
      - pulls is_canon/is_collectible/is_limited/is_hot from local Record table
        for any release the backend has previously seen.

    Items without a DB row still get is_limited if the format string matches.
    No external Discogs calls — bounded cost (single SQL IN-query).
    """
    if not items:
        return

    for item in items:
        fmt_lower = (getattr(item, format_attr, None) or "").lower()
        if any(tok in fmt_lower for tok in DiscogsService.LIMITED_TOKENS):
            item.is_limited = True

    ids = [getattr(item, id_attr) for item in items if getattr(item, id_attr, None)]
    if not ids:
        return
    rows = await db.execute(
        select(
            Record.discogs_id,
            Record.is_canon,
            Record.is_collectible,
            Record.is_limited,
            Record.is_hot,
        ).where(Record.discogs_id.in_(ids))
    )
    flags_by_id = {
        row.discogs_id: (row.is_canon, row.is_collectible, row.is_limited, row.is_hot)
        for row in rows
    }
    for item in items:
        f = flags_by_id.get(getattr(item, id_attr, None))
        if f:
            item.is_canon = item.is_canon or f[0]
            item.is_collectible = item.is_collectible or f[1]
            item.is_limited = item.is_limited or f[2]
            item.is_hot = item.is_hot or f[3]


async def _enrich_response_with_rub(
    response: RecordResponse,
    record: Record | None = None,
) -> RecordResponse:
    """Добавляет рублёвые цены в ответ через компонентную формулу из pricing.py."""
    base_price = response.estimated_price_median or response.estimated_price_min
    if not base_price:
        return response
    try:
        rate = await get_usd_rub_rate()
        params = PricingParams.from_settings(get_settings())
        discogs_data = record.discogs_data if record else None

        def _calc(price) -> float | None:
            if price is None:
                return None
            return estimate_rub(
                float(price),
                response.country,
                rate,
                params,
                format_type=response.format_type,
                format_description=response.format_description,
                discogs_data=discogs_data,
            )

        response.usd_rub_rate = rate
        response.ru_markup = effective_markup(
            float(base_price),
            response.country,
            rate,
            params,
            format_type=response.format_type,
            format_description=response.format_description,
            discogs_data=discogs_data,
        )
        response.estimated_price_min_rub = _calc(response.estimated_price_min)
        response.estimated_price_median_rub = _calc(response.estimated_price_median)
        response.estimated_price_max_rub = _calc(response.estimated_price_max)
    except Exception:
        logger.exception("Failed to enrich response with RUB prices")
    return response


async def _ensure_record_price_data(record: Record, db: AsyncSession) -> None:
    """Подтягивает цены из Discogs, если они отсутствуют в записи."""
    if record.estimated_price_min or record.estimated_price_median:
        return
    if not record.discogs_id:
        return
    try:
        discogs = DiscogsService()
        stats = await discogs._get_price_stats(record.discogs_id)
        if stats:
            lowest = stats.get("lowest_price", {}).get("value") if isinstance(stats.get("lowest_price"), dict) else stats.get("lowest_price")
            median = stats.get("median_price", {}).get("value") if isinstance(stats.get("median_price"), dict) else stats.get("median_price")
            highest = stats.get("highest_price", {}).get("value") if isinstance(stats.get("highest_price"), dict) else stats.get("highest_price")
            if lowest or median:
                record.estimated_price_min = lowest
                record.estimated_price_median = median
                record.estimated_price_max = highest
                await db.commit()
                await db.refresh(record)
    except Exception:
        logger.exception("Failed to ensure price data for record %s", record.discogs_id)


async def _ensure_record_artist_data(record: Record, db: AsyncSession) -> None:
    """
    Обогащает запись данными артиста (artist_id, artist_thumb_image_url),
    если они отсутствуют в discogs_data. Обновляет запись в БД для кэширования.
    """
    discogs_data = record.discogs_data
    if not discogs_data:
        return

    # Уже есть данные артиста — ничего не делаем
    if discogs_data.get("artist_thumb_image_url"):
        return

    artist_id = discogs_data.get("artist_id")

    # Если artist_id нет — достаём из Discogs по release ID
    if not artist_id and record.discogs_id:
        try:
            discogs = DiscogsService()
            release_raw = await discogs._get(
                f"{discogs.BASE_URL}/releases/{record.discogs_id}"
            )
            artists = release_raw.get("artists", [])
            if artists:
                artist_id = str(artists[0].get("id"))
        except Exception:
            logger.exception("Failed to fetch artist_id from Discogs for record %s", record.discogs_id)
            return

    if not artist_id:
        return

    # Получаем миниатюру артиста
    try:
        discogs = DiscogsService()
        artist_thumb = await discogs._get_artist_thumb(artist_id)
        if artist_thumb:
            # Обновляем discogs_data — переприсваиваем для корректного отслеживания SQLAlchemy
            updated_data = {**discogs_data, "artist_id": artist_id, "artist_thumb_image_url": artist_thumb}
            record.discogs_data = updated_data
            await db.commit()
            await db.refresh(record)
    except Exception:
        logger.exception("Failed to get artist thumb for artist %s", artist_id)


async def _ensure_record_discogs_payload(record: Record, db: AsyncSession) -> None:
    """
    Подтягивает полный Discogs-release payload, если запись минтилась без него.

    Сценарий: market-matcher создал Record из листинга магазина с минимальным
    набором полей (artist/title/barcode/cover) — без tracklist, label,
    catalog_number, master_id. Юзер открывает детальную → видит обложку,
    но нет треклиста и других версий релиза.

    Эта функция один раз тянет полный release из Discogs и обновляет запись.
    Дальше всё в БД, повторных Discogs-вызовов не будет.

    Условие срабатывания: tracklist пустой/null И есть discogs_id.
    """
    if not record.discogs_id:
        return
    if record.tracklist:  # уже есть — пропускаем
        return

    try:
        discogs = DiscogsService()
        data = await discogs.get_release(record.discogs_id, priority=Priority.DETAIL)
    except Exception:
        logger.exception("Failed to enrich record %s with Discogs payload", record.discogs_id)
        return

    if not data:
        return

    # Заполняем поля только если они пустые — не затираем уже существующие
    # (например, label из листинга магазина может быть точнее чем Discogs).
    changed = False
    if not record.tracklist and data.get("tracklist"):
        record.tracklist = data["tracklist"]
        changed = True
    if not record.discogs_master_id and data.get("master_id"):
        record.discogs_master_id = data["master_id"]
        changed = True
    if not record.label and data.get("label"):
        record.label = data["label"]
        changed = True
    if not record.catalog_number and data.get("catalog_number"):
        record.catalog_number = data["catalog_number"]
        changed = True
    if not record.year and data.get("year"):
        record.year = data["year"]
        changed = True
    if not record.country and data.get("country"):
        record.country = data["country"]
        changed = True
    if not record.genre and data.get("genre"):
        record.genre = data["genre"]
        changed = True
    if not record.style and data.get("style"):
        record.style = data["style"]
        changed = True
    if not record.format_type and data.get("format"):
        record.format_type = data["format"]
        changed = True

    # discogs_data МЕРДЖИМ, не перезаписываем — иначе теряем поля, которые
    # уже положил _ensure_record_artist_data (artist_id, artist_thumb_image_url).
    # data — свежий Discogs payload, может НЕ содержать artist_thumb_image_url
    # (он вычисляется отдельным запросом /artists/{id}). При перезаписи бы
    # обнулил аватар артиста на детальной — что я заметил в проде.
    if not record.discogs_data or "tracklist" not in (record.discogs_data or {}):
        existing = record.discogs_data or {}
        # Existing идёт ПОСЛЕДНИМ — приоритет у уже сохранённых ценных полей
        # (artist_id, artist_thumb_image_url, vinyl_color_raw).
        record.discogs_data = {**data, **existing}
        changed = True

    if changed:
        try:
            await db.commit()
            await db.refresh(record)
        except Exception:
            logger.exception("Failed to persist Discogs payload for record %s", record.discogs_id)
            await db.rollback()


async def get_or_create_record_by_discogs_id(
    discogs_id: str,
    db: AsyncSession
) -> Record:
    """
    Найти или создать Record по discogs_id.
    Используется в других endpoints для получения Record перед добавлением в коллекцию/вишлист.

    Защищён от concurrent INSERT: если два запроса одновременно не нашли запись
    и оба попытались её создать, проигравший ловит IntegrityError, делает rollback
    и читает запись, созданную победителем.
    """
    # Проверяем локальную БД
    result = await db.execute(
        select(Record).where(Record.discogs_id == discogs_id)
    )
    record = result.scalar_one_or_none()

    if record:
        return record

    # Запрос в Discogs (отдельный try — отделяем сетевые ошибки от ошибок БД).
    discogs = DiscogsService()
    try:
        record_data = await discogs.get_release(discogs_id)
    except Exception:
        logger.exception("Failed to fetch Discogs release %s", discogs_id)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Не удалось получить данные из Discogs. Попробуйте позже."
        )

    # Создаём запись в БД
    record = Record(
        discogs_id=record_data.get("id"),
        discogs_master_id=record_data.get("master_id"),
        title=record_data.get("title", "Unknown"),
        artist=record_data.get("artist", "Unknown"),
        label=record_data.get("label"),
        catalog_number=record_data.get("catalog_number"),
        year=record_data.get("year"),
        country=record_data.get("country"),
        genre=record_data.get("genre"),
        style=record_data.get("style"),
        format_type=record_data.get("format"),
        barcode=record_data.get("barcode"),
        cover_image_url=record_data.get("cover_image"),
        thumb_image_url=record_data.get("thumb_image"),
        estimated_price_min=record_data.get("price_min"),
        estimated_price_max=record_data.get("price_max"),
        estimated_price_median=record_data.get("price_median"),
        is_first_press=bool(record_data.get("is_first_press")),
        is_canon=bool(record_data.get("is_canon")),
        is_collectible=bool(record_data.get("is_collectible")),
        is_limited=bool(record_data.get("is_limited")),
        is_hot=bool(record_data.get("is_hot")),
        discogs_data=record_data,
        tracklist=record_data.get("tracklist"),
    )
    db.add(record)
    try:
        await db.commit()
        await db.refresh(record)
        return record
    except IntegrityError:
        # Параллельный запрос вставил Record с тем же discogs_id раньше нас —
        # откатываем и читаем существующую запись.
        await db.rollback()
        result = await db.execute(
            select(Record).where(Record.discogs_id == discogs_id)
        )
        existing = result.scalar_one_or_none()
        if existing is None:
            logger.error(
                "IntegrityError on Record insert but no existing row for discogs_id=%s",
                discogs_id,
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не удалось сохранить пластинку"
            )
        return existing


@router.get("/search", response_model=RecordSearchResponse)
async def search_records(
    response: Response,
    q: str = Query(..., min_length=1, description="Поисковый запрос"),
    artist: str | None = Query(None, description="Фильтр по артисту"),
    year: int | None = Query(None, description="Фильтр по году (точный)"),
    year_min: int | None = Query(None, description="Минимальный год (включительно)"),
    year_max: int | None = Query(None, description="Максимальный год (включительно)"),
    label: str | None = Query(None, description="Фильтр по лейблу"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    per_page: int = Query(20, ge=1, le=100, description="Записей на страницу"),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Поиск пластинок в Discogs.
    Не требует авторизации, но с авторизацией может сохранять историю.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    discogs = DiscogsService()

    try:
        results = await discogs.search(
            query=q,
            artist=artist,
            year=year,
            year_min=year_min,
            year_max=year_max,
            label=label,
            page=page,
            per_page=per_page
        )
        await _enrich_search_results_with_rarity(
            results.results, db, id_attr="discogs_id", format_attr="format_type"
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при поиске в Discogs: {str(e)}"
        )


@router.post("/scan/barcode", response_model=list[RecordSearchResult])
async def scan_barcode(
    barcode: str = Query(..., min_length=8, max_length=20, description="Штрихкод"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Поиск пластинки по штрихкоду.
    Требует авторизации.
    """
    # Сначала проверяем локальную БД
    result = await db.execute(
        select(Record).where(Record.barcode == barcode)
    )
    local_record = result.scalar_one_or_none()
    
    if local_record:
        return [RecordSearchResult(
            discogs_id=local_record.discogs_id or "",
            title=local_record.title,
            artist=local_record.artist,
            label=local_record.label,
            year=local_record.year,
            country=local_record.country,
            cover_image_url=local_record.cover_image_url,
            thumb_image_url=local_record.thumb_image_url,
            format_type=local_record.format_type,
        )]
    
    # Поиск в Discogs
    discogs = DiscogsService()
    
    try:
        results = await discogs.search_by_barcode(barcode)
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при поиске по штрихкоду: {str(e)}"
        )


@router.post("/scan/cover/", response_model=CoverScanResponse)
async def scan_cover(
    request: CoverScanRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Распознавание обложки пластинки через AI Vision.
    Принимает base64-encoded JPEG, возвращает результаты поиска Discogs.
    Требует авторизации.
    """
    if len(request.image_base64) > 10_000_000:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Изображение слишком большое (макс. ~7.5 МБ)"
        )

    vision = OpenAIVisionService()
    try:
        recognition = await vision.recognize_cover(request.image_base64)
    except CoverRecognitionError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка AI-сервиса: {str(e)}"
        )

    artist = recognition["artist"]
    album = recognition["album"]

    discogs = DiscogsService()

    async def _search_releases(query: str) -> list:
        """Поиск релизов без жёсткого artist-фильтра."""
        try:
            resp = await discogs.search(query=query, per_page=10)
            return resp.results
        except Exception:
            return []

    async def _search_masters(query: str) -> list:
        """Поиск мастер-релизов, конвертируем в RecordSearchResult."""
        try:
            resp = await discogs.search_masters(query=query, per_page=10)
            return [
                RecordSearchResult(
                    discogs_id=m.master_id,
                    title=m.title,
                    artist=m.artist,
                    year=m.year,
                    cover_image_url=m.cover_image_url,
                    thumb_image_url=m.thumb_image_url,
                )
                for m in resp.results
            ]
        except Exception:
            return []

    results: list = []

    # Стратегия 1: artist + album (самый точный запрос)
    if artist and album:
        results = await _search_releases(f"{artist} {album}")

    # Стратегия 2: только artist
    if not results and artist:
        results = await _search_releases(artist)

    # Стратегия 3: только album
    if not results and album:
        results = await _search_releases(album)

    # Стратегия 4: masters (artist + album или artist)
    if not results:
        master_query = f"{artist} {album}".strip() if artist or album else ""
        if master_query:
            results = await _search_masters(master_query)

    # Стратегия 5: masters только по artist
    if not results and artist:
        results = await _search_masters(artist)

    if not results:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Не удалось найти пластинку по распознанной обложке"
        )

    return CoverScanResponse(
        recognized_artist=artist,
        recognized_album=album,
        results=results,
    )


@router.get("/suggest")
async def suggest(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(8, ge=1, le=15),
):
    """
    Автодополнение: один запрос к Discogs, результаты разделяются по типу.
    Возвращает artists (до 3) и masters (до 5).
    """
    discogs = DiscogsService()
    try:
        return await discogs.suggest(query=q, per_page=limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка автодополнения: {str(e)}"
        )


@router.get("/{record_id}", response_model=RecordResponse)
async def get_record(
    record_id: UUID,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """Получение информации о пластинке"""
    result = await db.execute(select(Record).where(Record.id == record_id))
    record = result.scalar_one_or_none()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пластинка не найдена"
        )

    # Порядок важен: payload ПЕРЕД artist_data.
    # _ensure_record_discogs_payload может догрузить полный Discogs release
    # с tracklist'ом — и положить туда же artist_id, что потом сэкономит
    # _ensure_record_artist_data один HTTP-запрос. Если payload запустить
    # ПОСЛЕ artist_data — мердж сохранит artist_thumb_image_url, но и так
    # лучше избежать лишнего запроса.
    await _ensure_record_discogs_payload(record, db)
    await _ensure_record_artist_data(record, db)
    await _ensure_record_price_data(record, db)

    response = RecordResponse.model_validate(record)
    discogs_data = record.discogs_data or {}
    response.artist_id = discogs_data.get("artist_id")
    response.artist_thumb_image_url = discogs_data.get("artist_thumb_image_url")
    response.vinyl_color_raw = discogs_data.get("vinyl_color_raw")
    return await _enrich_response_with_rub(response, record)


@router.get("/discogs/{discogs_id}", response_model=RecordResponse)
async def get_record_by_discogs_id(
    discogs_id: str,
    response: Response,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Получение информации о пластинке по Discogs ID.
    Если пластинка не найдена в локальной БД, запрашивает Discogs и сохраняет.
    """
    # max-age 60 (раньше 3600) — после первой загрузки enrichment может
    # дополнить запись tracklist/artist_thumb/master_id. Если кэш на час,
    # юзер видит пустые поля до истечения. С 60 сек обновление через минуту.
    response.headers["Cache-Control"] = "public, max-age=60"
    # Проверяем локальную БД
    result = await db.execute(
        select(Record).where(Record.discogs_id == discogs_id)
    )
    record = result.scalar_one_or_none()

    if record:
        # Порядок: payload ПЕРЕД artist_data — payload может положить
        # artist_id в discogs_data, что сэкономит запрос /releases/{id}
        # внутри _ensure_record_artist_data. См. идентичный блок в get_record().
        await _ensure_record_discogs_payload(record, db)
        await _ensure_record_artist_data(record, db)
        await _ensure_record_price_data(record, db)

        discogs_data = record.discogs_data or {}
        response = RecordResponse.model_validate(record)
        response.artist_id = discogs_data.get("artist_id")
        response.artist_thumb_image_url = discogs_data.get("artist_thumb_image_url")
        response.vinyl_color_raw = discogs_data.get("vinyl_color_raw")
        return await _enrich_response_with_rub(response, record)

    # Запрос в Discogs с watchdog: клиент не висит 60 сек.
    # asyncio.shield + create_task — на таймаут отдаём 503, но запрос
    # к Discogs продолжается в фоне и кладёт результат в Redis,
    # так что повторный запрос юзера отвечает мгновенно.
    discogs = DiscogsService()
    fetch_task = asyncio.create_task(discogs.get_release(discogs_id))
    fetch_task.add_done_callback(
        lambda t: t.exception() if not t.cancelled() else None
    )

    try:
        record_data = await asyncio.wait_for(asyncio.shield(fetch_task), timeout=20)
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Discogs отвечает медленно. Попробуйте ещё раз через несколько секунд — данные подгружаются в фоне."
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при получении данных из Discogs: {str(e)}"
        )

    try:
        record = Record(
            discogs_id=record_data.get("id"),
            discogs_master_id=record_data.get("master_id"),
            title=record_data.get("title", "Unknown"),
            artist=record_data.get("artist", "Unknown"),
            label=record_data.get("label"),
            catalog_number=record_data.get("catalog_number"),
            year=record_data.get("year"),
            country=record_data.get("country"),
            genre=record_data.get("genre"),
            style=record_data.get("style"),
            format_type=record_data.get("format"),
            barcode=record_data.get("barcode"),
            cover_image_url=record_data.get("cover_image"),
            thumb_image_url=record_data.get("thumb_image"),
            estimated_price_min=record_data.get("price_min"),
            estimated_price_max=record_data.get("price_max"),
            estimated_price_median=record_data.get("price_median"),
            is_first_press=bool(record_data.get("is_first_press")),
            is_canon=bool(record_data.get("is_canon")),
            is_collectible=bool(record_data.get("is_collectible")),
            is_limited=bool(record_data.get("is_limited")),
            is_hot=bool(record_data.get("is_hot")),
            discogs_data=record_data,
            tracklist=record_data.get("tracklist"),
        )

        db.add(record)
        await db.commit()
        await db.refresh(record)

        response = RecordResponse.model_validate(record)
        response.artist_id = record_data.get("artist_id")
        response.artist_thumb_image_url = record_data.get("artist_thumb_image_url")
        response.vinyl_color_raw = record_data.get("vinyl_color_raw")
        return await _enrich_response_with_rub(response, record)

    except IntegrityError:
        await db.rollback()
        result = await db.execute(
            select(Record).where(Record.discogs_id == discogs_id)
        )
        record = result.scalar_one_or_none()
        if record:
            response = RecordResponse.model_validate(record)
            response.artist_id = record_data.get("artist_id")
            response.artist_thumb_image_url = record_data.get("artist_thumb_image_url")
            response.vinyl_color_raw = record_data.get("vinyl_color_raw")
            return await _enrich_response_with_rub(response, record)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Не удалось сохранить запись",
        )


@router.post("/", response_model=RecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record(
    record_data: RecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Создание пластинки вручную (без Discogs).
    Требует авторизации.
    """
    record = Record(**record_data.model_dump())
    db.add(record)
    await db.commit()
    await db.refresh(record)

    return record


@router.get("/masters/search", response_model=MasterSearchResponse)
async def search_masters(
    response: Response,
    q: str = Query(..., min_length=1, description="Поисковый запрос"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    per_page: int = Query(20, ge=1, le=100, description="Записей на страницу"),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Поиск мастер-релизов в Discogs.
    Не требует авторизации.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    discogs = DiscogsService()

    try:
        results = await discogs.search_masters(
            query=q,
            page=page,
            per_page=per_page
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при поиске мастер-релизов: {str(e)}"
        )


@router.get("/releases/search", response_model=ReleaseSearchResponse)
async def search_releases(
    response: Response,
    q: str = Query(..., min_length=1, description="Поисковый запрос"),
    format: str | None = Query(None, description="Фильтр по формату (Vinyl, CD, Cassette)"),
    country: str | None = Query(None, description="Фильтр по стране"),
    year: int | None = Query(None, description="Фильтр по году (точный)"),
    year_min: int | None = Query(None, description="Минимальный год (включительно)"),
    year_max: int | None = Query(None, description="Максимальный год (включительно)"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    per_page: int = Query(20, ge=1, le=100, description="Записей на страницу"),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Поиск конкретных релизов с фильтрами в Discogs.
    Не требует авторизации.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    discogs = DiscogsService()

    try:
        results = await discogs.search_releases(
            query=q,
            format=format,
            country=country,
            year=year,
            year_min=year_min,
            year_max=year_max,
            page=page,
            per_page=per_page
        )
        await _enrich_search_results_with_rarity(
            results.results, db, id_attr="release_id", format_attr="format"
        )
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при поиске релизов: {str(e)}"
        )


@router.get("/masters/{master_id}", response_model=MasterRelease)
async def get_master(
    master_id: str,
    response: Response,
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Получение информации о мастер-релизе.
    Не требует авторизации.
    """
    response.headers["Cache-Control"] = "public, max-age=3600"
    discogs = DiscogsService()

    try:
        master = await discogs.get_master(master_id)
        return master
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при получении мастер-релиза: {str(e)}"
        )


@router.get("/masters/{master_id}/versions", response_model=MasterVersionsResponse)
async def get_master_versions(
    master_id: str,
    response: Response,
    background_tasks: BackgroundTasks,
    page: int = Query(1, ge=1, description="Номер страницы"),
    per_page: int = Query(50, ge=1, le=100, description="Записей на страницу"),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Получение всех версий (изданий) мастер-релиза.
    Не требует авторизации.

    Стратегия (fix axios 60s timeout, 2026-05):
    - Синхронная часть отдаёт is_canon/is_limited/is_hot — всё, что считается
      без N+1 к /releases/{id}. is_hot берём из stats.community мастер-versions
      response.
    - is_collectible требует price_stats + formats[].descriptions из
      /releases/{id} — отправляем в BackgroundTasks и пишем в
      master_versions_enriched. Следующий заход юзера получает enriched-ответ
      из Redis.
    - Single-flight через Redis-lock защищает от запуска параллельных
      enrichment-тасков на одну страницу.
    - Watchdog 25 сек на синхронной части — чтобы клиент не висел в axios
      timeout 60s, если Discogs отвечает медленно.
    """
    response.headers["Cache-Control"] = "public, max-age=3600"

    # Кэш ENRICHED-ответа отдельный — get_master_versions кэширует только сырые
    # данные от Discogs (теперь с is_hot), здесь храним полностью обогащённую
    # версию (с is_collectible), чтобы не делать N×get_release на каждый запрос.
    enriched_ck = f"{master_id}:p{page}:pp{per_page}"
    cached_enriched = await cache.get("master_versions_enriched", enriched_ck)
    if cached_enriched:
        return MasterVersionsResponse(**cached_enriched)

    discogs = DiscogsService()

    try:
        versions, main_release_id = await asyncio.wait_for(
            _fetch_master_versions_and_main_release(discogs, master_id, page, per_page),
            timeout=25,
        )
    except asyncio.TimeoutError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Discogs API отвечает медленно — попробуйте ещё раз через минуту",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при получении версий мастер-релиза: {str(e)}"
        )

    # Дешёвые «on-the-fly» флаги для всех версий:
    # - is_canon = release_id == master.main_release_id
    # - is_limited = парсинг строки format на токены
    # - is_hot уже выставлен в discogs.get_master_versions из stats.community
    for v in versions.results:
        if main_release_id and v.release_id == main_release_id:
            v.is_canon = True
        fmt_lower = (v.format or "").lower()
        if any(tok in fmt_lower for tok in DiscogsService.LIMITED_TOKENS):
            v.is_limited = True

    # Локальная БД дополняет всеми флагами для виденных
    release_ids = [v.release_id for v in versions.results if v.release_id]
    seen_ids: set[str] = set()
    if release_ids:
        rows = await db.execute(
            select(
                Record.discogs_id,
                Record.is_canon,
                Record.is_collectible,
                Record.is_limited,
                Record.is_hot,
            ).where(Record.discogs_id.in_(release_ids))
        )
        flags_by_id = {
            row.discogs_id: (row.is_canon, row.is_collectible, row.is_limited, row.is_hot)
            for row in rows
        }
        seen_ids = set(flags_by_id.keys())
        for v in versions.results:
            f = flags_by_id.get(v.release_id)
            if f:
                v.is_canon = v.is_canon or f[0]
                v.is_collectible = v.is_collectible or f[1]
                v.is_limited = v.is_limited or f[2]
                v.is_hot = v.is_hot or f[3]

    # Для невиденных в БД — is_collectible считаем фоном через get_release.
    # Юзер получает ответ за ~1–3 сек на холоде; enriched-кэш заполнится
    # к следующему заходу или pull-to-refresh.
    unseen_ids = [v.release_id for v in versions.results if v.release_id and v.release_id not in seen_ids]
    if unseen_ids:
        background_tasks.add_task(
            _enrich_collectible_async,
            master_id=master_id,
            page=page,
            per_page=per_page,
            versions_dump=versions.model_dump(),
            unseen_ids=unseen_ids,
            enriched_ck=enriched_ck,
        )
    else:
        # Все виденные — можно сразу записать enriched-кэш
        await cache.set("master_versions_enriched", enriched_ck, versions.model_dump(), TTL_MASTER_VERSIONS)

    return versions


async def _fetch_master_versions_and_main_release(
    discogs: DiscogsService,
    master_id: str,
    page: int,
    per_page: int,
) -> tuple[MasterVersionsResponse, str | None]:
    """Параллельно тянем versions + master.main_release_id под общим watchdog."""
    versions_task = asyncio.create_task(
        discogs.get_master_versions(master_id=master_id, page=page, per_page=per_page)
    )
    master_task = asyncio.create_task(discogs.get_master(master_id))

    versions = await versions_task
    try:
        master = await master_task
        main_release_id = str(master.main_release_id) if master.main_release_id else None
    except Exception:
        main_release_id = None
    return versions, main_release_id


async def _enrich_collectible_async(
    *,
    master_id: str,
    page: int,
    per_page: int,
    versions_dump: dict,
    unseen_ids: list[str],
    enriched_ck: str,
) -> None:
    """Фоновое обогащение is_collectible через discogs.get_release.

    Single-flight: Redis-lock не даёт двум воркерам обогащать одну страницу
    параллельно. Watchdog 120 сек защищает от вечного зависания.
    По завершении пишет master_versions_enriched, чтобы следующий заход
    юзера попал в кэш.
    """
    lock_key = f"enriching:{master_id}:p{page}:pp{per_page}"
    if not await cache.set_nx("master_versions_lock", lock_key, "1", ttl=180):
        # Другой воркер уже обогащает эту страницу
        return

    try:
        versions = MasterVersionsResponse(**versions_dump)
        unseen_set = set(unseen_ids)
        unseen_versions = [v for v in versions.results if v.release_id in unseen_set]
        if not unseen_versions:
            await cache.set("master_versions_enriched", enriched_ck, versions.model_dump(), TTL_MASTER_VERSIONS)
            return

        discogs = DiscogsService()
        sem = asyncio.Semaphore(5)

        async def fetch_flags(v):
            async with sem:
                try:
                    # Priority.ENRICHMENT, чтобы фоновое обогащение не дренило
                    # token-bucket и не тормозило UI-запросы юзера, ждущие
                    # тех же токенов с Priority.DETAIL.
                    data = await discogs.get_release(v.release_id, priority=Priority.ENRICHMENT)
                    v.is_canon = v.is_canon or bool(data.get("is_canon"))
                    v.is_collectible = v.is_collectible or bool(data.get("is_collectible"))
                    v.is_limited = v.is_limited or bool(data.get("is_limited"))
                    v.is_hot = v.is_hot or bool(data.get("is_hot"))
                except Exception:
                    pass

        try:
            await asyncio.wait_for(
                asyncio.gather(*[fetch_flags(v) for v in unseen_versions]),
                timeout=120,
            )
        except asyncio.TimeoutError:
            logger.warning(
                "master_versions enrichment timeout master_id=%s page=%s",
                master_id, page,
            )

        await cache.set("master_versions_enriched", enriched_ck, versions.model_dump(), TTL_MASTER_VERSIONS)
    finally:
        await cache.delete("master_versions_lock", lock_key)


@router.get("/artists/search", response_model=ArtistSearchResponse)
async def search_artists(
    response: Response,
    q: str = Query(..., min_length=1, description="Поисковый запрос"),
    page: int = Query(1, ge=1, description="Номер страницы"),
    per_page: int = Query(20, ge=1, le=100, description="Записей на страницу"),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Поиск артистов в Discogs.
    Не требует авторизации.
    """
    response.headers["Cache-Control"] = "public, max-age=300"
    discogs = DiscogsService()

    try:
        results = await discogs.search_artists(
            query=q,
            page=page,
            per_page=per_page
        )
        for artist in results.results:
            artist.name = clean_artist_name(artist.name) or artist.name
        return results
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при поиске артистов: {str(e)}"
        )


@router.get("/artists/{artist_id}", response_model=Artist)
async def get_artist(
    artist_id: str,
    response: Response,
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Получение информации об артисте.
    Не требует авторизации.
    """
    response.headers["Cache-Control"] = "public, max-age=1800"
    discogs = DiscogsService()

    try:
        artist = await discogs.get_artist(artist_id)
        return artist
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при получении данных артиста: {str(e)}"
        )


@router.get("/artists/{artist_id}/releases", response_model=ReleaseSearchResponse)
async def get_artist_releases(
    artist_id: str,
    response: Response,
    page: int = Query(1, ge=1, description="Номер страницы"),
    per_page: int = Query(50, ge=1, le=100, description="Записей на страницу"),
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    """
    Получение релизов артиста.
    Не требует авторизации.
    """
    response.headers["Cache-Control"] = "public, max-age=1800"
    discogs = DiscogsService()

    try:
        releases = await discogs.get_artist_releases(
            artist_id=artist_id,
            page=page,
            per_page=per_page
        )
        await _enrich_search_results_with_rarity(
            releases.results, db, id_attr="release_id", format_attr="format"
        )
        return releases
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при получении релизов артиста: {str(e)}"
        )


@router.get("/artists/{artist_id}/masters", response_model=MasterSearchResponse)
async def get_artist_masters(
    artist_id: str,
    response: Response,
    page: int = Query(1, ge=1, description="Номер страницы"),
    per_page: int = Query(100, ge=1, le=100, description="Записей на страницу"),
    load_all: bool = Query(False, description="Загрузить все страницы сразу"),
    current_user: User | None = Depends(get_current_user_optional),
):
    """
    Получение только master releases артиста (альбомы, синглы, EP).
    Возвращает только основные релизы без всех версий/изданий.
    При load_all=true загружает все страницы за один вызов.
    Не требует авторизации.
    """
    response.headers["Cache-Control"] = "public, max-age=1800"
    discogs = DiscogsService()

    try:
        masters = await discogs.get_artist_masters(
            artist_id=artist_id,
            page=page,
            per_page=per_page,
            load_all=load_all,
        )
        return masters
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при получении master releases артиста: {str(e)}"
        )

