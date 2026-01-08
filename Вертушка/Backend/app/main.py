"""
Главный файл приложения Вертушка API
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import get_settings
from app.database import init_db, close_db

# API роутеры
from app.api import auth, records, collections, wishlists, users, gifts

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle события приложения"""
    # Startup
    print("🚀 Запуск Вертушка API...")
    await init_db()
    print("✅ База данных инициализирована")
    
    yield
    
    # Shutdown
    print("👋 Остановка Вертушка API...")
    await close_db()
    print("✅ Подключение к БД закрыто")


# Создание приложения
app = FastAPI(
    title=settings.app_name,
    description="API для приложения сканирования и управления коллекцией виниловых пластинок",
    version=settings.app_version,
    lifespan=lifespan,
    docs_url="/api/docs" if settings.debug else None,
    redoc_url="/api/redoc" if settings.debug else None,
)

# CORS настройки
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8080",
        settings.frontend_url,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Статические файлы и шаблоны
app.mount("/static", StaticFiles(directory="app/web/static"), name="static")
templates = Jinja2Templates(directory="app/web/templates")

# Подключение API роутеров
app.include_router(auth.router, prefix="/api/auth", tags=["Аутентификация"])
app.include_router(records.router, prefix="/api/records", tags=["Пластинки"])
app.include_router(collections.router, prefix="/api/collections", tags=["Коллекции"])
app.include_router(wishlists.router, prefix="/api/wishlists", tags=["Вишлисты"])
app.include_router(users.router, prefix="/api/users", tags=["Пользователи"])
app.include_router(gifts.router, prefix="/api/gifts", tags=["Подарки"])


@app.get("/", tags=["Health"])
async def root():
    """Главная страница API"""
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "status": "running",
        "docs": "/api/docs" if settings.debug else "disabled"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Проверка здоровья API"""
    return {"status": "healthy"}

