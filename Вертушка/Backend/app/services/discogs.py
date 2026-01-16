"""
Сервис для работы с Discogs API
"""
import httpx
from typing import Any

from app.config import get_settings
from app.schemas.record import RecordSearchResult, RecordSearchResponse

settings = get_settings()


class DiscogsService:
    """Сервис для работы с Discogs API"""
    
    BASE_URL = "https://api.discogs.com"
    
    def __init__(self):
        self.api_key = settings.discogs_api_key
        self.api_secret = settings.discogs_api_secret
        self.user_agent = settings.discogs_user_agent
    
    def _get_headers(self) -> dict:
        """Получение заголовков для запросов"""
        headers = {
            "User-Agent": self.user_agent,
        }
        if self.api_key:
            headers["Authorization"] = f"Discogs key={self.api_key}, secret={self.api_secret}"
        return headers
    
    async def search(
        self,
        query: str,
        artist: str | None = None,
        year: int | None = None,
        label: str | None = None,
        page: int = 1,
        per_page: int = 20
    ) -> RecordSearchResponse:
        """
        Поиск пластинок в Discogs.
        
        Args:
            query: Поисковый запрос
            artist: Фильтр по артисту
            year: Фильтр по году
            label: Фильтр по лейблу
            page: Номер страницы
            per_page: Записей на страницу
        
        Returns:
            RecordSearchResponse с результатами поиска
        """
        params = {
            "q": query,
            "type": "release",
            "page": page,
            "per_page": per_page,
        }
        
        if artist:
            params["artist"] = artist
        if year:
            params["year"] = year
        if label:
            params["label"] = label
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/database/search",
                params=params,
                headers=self._get_headers(),
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
        
        results = []
        for item in data.get("results", []):
            # Парсим артиста и название
            title = item.get("title", "")
            artist_name = "Unknown"
            album_title = title
            
            if " - " in title:
                parts = title.split(" - ", 1)
                artist_name = parts[0]
                album_title = parts[1] if len(parts) > 1 else title
            
            results.append(RecordSearchResult(
                discogs_id=str(item.get("id", "")),
                title=album_title,
                artist=artist_name,
                label=item.get("label", [None])[0] if item.get("label") else None,
                year=int(item.get("year")) if item.get("year") else None,
                country=item.get("country"),
                cover_image_url=item.get("cover_image"),
                thumb_image_url=item.get("thumb"),
                format_type=item.get("format", [None])[0] if item.get("format") else None,
            ))
        
        pagination = data.get("pagination", {})
        
        return RecordSearchResponse(
            results=results,
            total=pagination.get("items", 0),
            page=pagination.get("page", page),
            per_page=pagination.get("per_page", per_page)
        )
    
    async def search_by_barcode(self, barcode: str) -> list[RecordSearchResult]:
        """
        Поиск пластинки по штрихкоду.
        
        Args:
            barcode: Штрихкод (EAN-13, UPC-A и т.д.)
        
        Returns:
            Список найденных пластинок
        """
        params = {
            "barcode": barcode,
            "type": "release",
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/database/search",
                params=params,
                headers=self._get_headers(),
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
        
        results = []
        for item in data.get("results", []):
            title = item.get("title", "")
            artist_name = "Unknown"
            album_title = title
            
            if " - " in title:
                parts = title.split(" - ", 1)
                artist_name = parts[0]
                album_title = parts[1] if len(parts) > 1 else title
            
            results.append(RecordSearchResult(
                discogs_id=str(item.get("id", "")),
                title=album_title,
                artist=artist_name,
                label=item.get("label", [None])[0] if item.get("label") else None,
                year=int(item.get("year")) if item.get("year") else None,
                country=item.get("country"),
                cover_image_url=item.get("cover_image"),
                thumb_image_url=item.get("thumb"),
                format_type=item.get("format", [None])[0] if item.get("format") else None,
            ))
        
        return results
    
    async def get_release(self, release_id: str) -> dict[str, Any]:
        """
        Получение детальной информации о релизе.
        
        Args:
            release_id: ID релиза в Discogs
        
        Returns:
            Словарь с данными релиза
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/releases/{release_id}",
                headers=self._get_headers(),
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
        
        # Извлекаем артистов
        artists = data.get("artists", [])
        artist_name = ", ".join([a.get("name", "") for a in artists]) if artists else "Unknown"
        
        # Извлекаем лейбл
        labels = data.get("labels", [])
        label = labels[0].get("name") if labels else None
        catalog_number = labels[0].get("catno") if labels else None
        
        # Извлекаем жанры
        genres = data.get("genres", [])
        genre = ", ".join(genres) if genres else None
        
        styles = data.get("styles", [])
        style = ", ".join(styles) if styles else None
        
        # Извлекаем формат
        formats = data.get("formats", [])
        format_type = formats[0].get("name") if formats else None
        format_desc = ", ".join(formats[0].get("descriptions", [])) if formats else None
        
        # Извлекаем штрихкоды
        identifiers = data.get("identifiers", [])
        barcode = None
        for ident in identifiers:
            if ident.get("type") == "Barcode":
                barcode = ident.get("value")
                break
        
        # Извлекаем изображения
        images = data.get("images", [])
        cover_image = None
        thumb_image = None
        if images:
            cover_image = images[0].get("uri")
            thumb_image = images[0].get("uri150")
        
        # Извлекаем треклист
        tracklist = []
        for track in data.get("tracklist", []):
            tracklist.append({
                "position": track.get("position"),
                "title": track.get("title"),
                "duration": track.get("duration")
            })
        
        # Получаем ценовую статистику (если доступно)
        price_min = None
        price_max = None
        price_median = None
        
        # Пробуем получить статистику цен
        try:
            stats_response = await self._get_price_stats(release_id)
            if stats_response:
                price_min = stats_response.get("lowest_price", {}).get("value")
                price_median = stats_response.get("median_price", {}).get("value")
        except Exception:
            pass  # Игнорируем ошибки получения цен
        
        return {
            "id": str(data.get("id")),
            "master_id": str(data.get("master_id")) if data.get("master_id") else None,
            "title": data.get("title"),
            "artist": artist_name,
            "label": label,
            "catalog_number": catalog_number,
            "year": data.get("year"),
            "country": data.get("country"),
            "genre": genre,
            "style": style,
            "format": format_type,
            "format_description": format_desc,
            "barcode": barcode,
            "cover_image": cover_image,
            "thumb_image": thumb_image,
            "tracklist": tracklist,
            "price_min": price_min,
            "price_max": price_max,
            "price_median": price_median,
            "notes": data.get("notes"),
            "data_quality": data.get("data_quality"),
        }
    
    async def _get_price_stats(self, release_id: str) -> dict | None:
        """Получение статистики цен для релиза"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.BASE_URL}/marketplace/stats/{release_id}",
                    headers=self._get_headers(),
                    timeout=10.0
                )
                if response.status_code == 200:
                    return response.json()
        except Exception:
            pass
        return None

