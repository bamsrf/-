# Проект Вертушка

## Структура
```
Вертушка/
├── Backend/    # FastAPI (Python)
└── Mobile/     # Expo/React Native (TypeScript)
```

## Backend (FastAPI)
- **API**: `Backend/app/api/` — auth.py, records.py, collections.py, wishlists.py
- **Модели**: `Backend/app/models/` — SQLAlchemy
- **Схемы**: `Backend/app/schemas/` — Pydantic
- **Сервисы**: `Backend/app/services/` — бизнес-логика (discogs.py)
- **Конфиг**: `Backend/app/config.py`, `Backend/app/database.py`
- **Entry**: `Backend/app/main.py`

### Команды Backend
```bash
cd Вертушка/Backend && uvicorn app.main:app --reload  # локально
git push && ssh deploy@85.198.85.12 'cd ~/vertushka && bash Вертушка/Backend/scripts/deploy.sh'  # деплой
```
**Prod API**: `https://api.vinyl-vertushka.ru/api`

## Mobile (Expo/React Native)
- **Экраны**: `Mobile/app/` — Expo Router
  - `(auth)/` — login.tsx, register.tsx
  - `(tabs)/` — index.tsx, collection.tsx, search.tsx
  - `record/[id].tsx` — детали записи
- **Компоненты**: `Mobile/components/`, `Mobile/components/ui/`
- **Логика**: `Mobile/lib/` — api.ts, store.ts, types.ts
- **Тема**: `Mobile/constants/theme.ts`

### Команды Mobile
```bash
cd "/Users/vladislavrumancev/Desktop/Cursor/Вертушка/Mobile" && npm start
```

## Гайдлайны кода

### TypeScript (Mobile)
- Типы в `lib/types.ts`, interfaces > types, без `any`
- PascalCase классы, camelCase переменные, kebab-case файлы
- Функции < 20 строк, early returns, RO-RO паттерн

### React Native
- Functional components, named exports
- Zustand для стейта (`lib/store.ts`), Axios для API (`lib/api.ts`)
- Expo Router file-based navigation
- Минимум useState/useEffect — предпочитать Zustand

### Python (Backend)
- FastAPI + SQLAlchemy + Pydantic
- Async endpoints где возможно
- Валидация через Pydantic схемы

### Общее
- Без TODO, плейсхолдеров — полная реализация
- Trailing slashes в endpoints (`/collections/`, `/wishlists/`)
- После изменений: "Don't forget to commit!"
