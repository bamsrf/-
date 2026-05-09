# Вертушка 🎵

Мобильное приложение для коллекционеров винила: каталог пластинок, поиск через Discogs, рарити-теги, рублёвые цены, публичные профили и gift-booking.

> Главный living document — [ROADMAP.md](ROADMAP.md) (Snapshot, Milestones M1–M10, Changelog). Прод-API: `https://api.vinyl-vertushka.ru/api`.

---

## Что умеет приложение

### Коллекция
- Поиск и добавление пластинок через Discogs (15M+ релизов), сканер штрихкода и распознавание обложки через камеру (GPT-4o Vision).
- Папки (folders), condition / sleeve_condition / заметки / shelf_position, фото пластинок.
- **Цена в рублях** по компонентной формуле `(USD + shipping) × (1 + overhead) + customs` с учётом формата (box ×1.6, 7" ×0.6 и т.д.).
- Ежедневные снапшоты стоимости коллекции → дельта за 30 дней.

### Рарити-теги (3 тира)
- 💚 **Коллекционка** — цена ≥ $100 AND num_for_sale ≤ 3 AND have ≤ 200.
- 🟣 **Лимитка** — Test Pressing / Promo / Limited Edition / Numbered / White Label.
- 🟠 **Популярно** — have ≥ 100 AND want/have ≥ 1.5.
- Визуал: `RarityAura` (rotating gradient / pulse / ember). Один тир на запись по приоритету.

### Поиск
- Текстовый поиск с транслитерацией кириллицы, suggest-автодополнение, история (5 + «показать ещё»).
- Витрина новинок (24 релиза) с pause-on-touch.
- Страницы артистов и мастер-релизов с «Все версии».
- Цвет винила из Discogs — `VinylColorTag` + анимированный `VinylSpinner`.

### Вишлист и подарки
- Вишлист с приоритетами и пометкой «куплено», экран **«Я дарю / Мне дарят»**.
- **Gift-booking**: незарегистрированный даритель бронирует пластинку по share-ссылке, получает cancel-token и email-подтверждение.
- Анти-фрод: блок-лист контактов (`blocked_contacts`), email-верификация дарителя, опциональный `reveal_gifter`.
- Веб-страница `/cancel` для отмены бронирования + success sheet.

### Социалка
- Публичный профиль с `share_token`, выбором видимости (collection / wishlist / prices / year / format), highlight-пластинками и OG-картинкой.
- Fun-stats (14 шт) с русскими склонениями, fade-ротацией, правилом 0=hide.
- Подписки (Follow), лента активности `social/list`.
- Веб-версия профиля (Jinja-шаблоны) с фильтром формата, grid/list, sticky CTA, превью пластинки.

### Авторизация
- Email + пароль, **Apple Sign In**, **Google OAuth**.
- Восстановление пароля через коды на email.
- Soft delete + 30-дневное окно восстановления аккаунта.

### UX
- Онбординг v2: welcome-карусель + 10-шаговый интерактивный тур со spotlight.
- Дизайн-система V2 (icons из единой библиотеки, GlassTabBar, halo wrapper).
- Экспорт коллекции и вишлиста в CSV.
- Amplitude для продуктовой аналитики.

---

## Стек

### Mobile (`Mobile/`)
- **Expo SDK 54**, **React Native 0.81.5**, **React 19.1**, **Expo Router 6**, TypeScript.
- **Zustand 5** (5 сторов: auth, collection, scanner, searchHistory, onboarding).
- **Axios 1.13** с retry и token-refresh интерцепторами.
- `expo-image` (disk cache), `expo-camera`, `expo-barcode-scanner`, `react-native-reanimated 4`, `phosphor-react-native`, `react-native-svg`.
- `@react-native-google-signin/google-signin`, `expo-apple-authentication`, `@amplitude/analytics-react-native`.
- EAS configured, bundle id `com.vertushka.app`.

### Backend (`Backend/`)
- **FastAPI 0.109** + **SQLAlchemy 2 (asyncpg)** + **PostgreSQL** + **Redis** + **Alembic**.
- **APScheduler** — фоновые задачи (обновление цен 04:00, обогащение артистов 05:00, очистка booking-токенов, search_cache cleanup).
- **httpx / aiohttp**, **Pillow**, **Jinja2** (веб-страницы), **bcrypt + jose**, **aiosmtplib** (Yandex SMTP).
- Token-bucket rate-limiter Discogs (60 tokens, 1/sec, capacity 55) + приоритетная очередь SEARCH→DETAIL→SCAN→ENRICHMENT→BATCH + circuit breaker.
- Docker Compose, Nginx, Sentry, structured JSON logging, Supabase mirror для аналитики.

### Внешние интеграции
- **Discogs API** (search / releases / masters / marketplace stats, кэш 7 дней).
- **OpenAI Vision** (распознавание обложек).
- **ЦБ РФ** (курс USD/RUB, кэш).
- **Yandex SMTP** (восстановление пароля, gift-booking).

---

## Структура

```
Вертушка/                  # git root, github.com/bamsrf/Vertushka
├── Backend/               # FastAPI
│   ├── app/
│   │   ├── api/           # 12 роутеров: auth, records, collections, wishlists,
│   │   │                  # users, gifts, profile, export, covers, user_photos,
│   │   │                  # waitlist, masters
│   │   ├── models/        # 12 моделей: user, record, collection, wishlist,
│   │   │                  # gift_booking, blocked_contact, follow, profile_share,
│   │   │                  # collection_value_snapshot, user_photo, waitlist,
│   │   │                  # search_cache
│   │   ├── services/      # 14 сервисов: discogs, pricing, valuation, exchange,
│   │   │                  # cache, cover_storage, openai_vision, email,
│   │   │                  # notifications, rate_limiter, search_cache_db,
│   │   │                  # gifts, og_image
│   │   ├── tasks/         # booking_tasks, discogs_tasks, valuation_tasks
│   │   ├── web/           # routes.py + Jinja-шаблоны (публичный профиль, /cancel)
│   │   └── scripts/       # recalc_collection_rub, backfill_rarity_flags,
│   │                      # backfill_vinyl_colors, mirror_to_supabase, …
│   ├── nginx/, scripts/deploy.sh, scripts/backup.sh
│   └── docker-compose.prod.yml
│
├── Mobile/                # Expo / React Native
│   ├── app/               # Expo Router
│   │   ├── (auth)/        # login, register, forgot-password, reset-password,
│   │   │                  # verify-code
│   │   ├── (tabs)/        # index, collection, search
│   │   ├── record/[id]    # детали пластинки + «Все версии релиза»
│   │   ├── master/[id]/   # мастер-релиз + версии
│   │   ├── artist/[id]    # дискография
│   │   ├── user/[username]# публичный профиль
│   │   ├── gift/[id]      # детальный экран подарка
│   │   ├── social/list    # лента активности
│   │   ├── settings/, folder/[id], onboarding.tsx, profile.tsx
│   ├── components/        # RarityAura, RecordCard/Grid, VinylColorTag,
│   │                      # VinylSpinner, GlassTabBar, AnimatedGradientText,
│   │                      # AutoRail, OnboardingOverlay, SocialAuthButtons, …
│   ├── components/ui/     # design-system v2 (Icon)
│   └── lib/               # api, store, types, analytics, toast, vinylColor
│
├── Design/                # дизайн-ассеты
├── docs/
│   ├── BUGS.md
│   └── plans/             # ROADMAP детализация (RARITY, RELEASE_v2, …)
├── ROADMAP.md             # главный living document
└── scripts/               # repo-wide tooling (sync_roadmap.py)
```

---

## Принципы работы с Discogs API

Discogs hard-cap: **60 req/min** для аутентифицированных запросов. Чтобы UI не упирался в этот потолок, придерживаемся следующих правил:

1. **Никогда не делать N+1 запросов в синхронной части эндпоинта.** Если экран показывает список из N релизов, эндпоинт обязан укладываться в O(1)–O(2) Discogs-запросов. Всё, что требует обращения к `/releases/{id}` per-item, уезжает в `BackgroundTasks`.
2. **Использовать всё, что Discogs уже отдаёт в ответе.** В `/masters/{id}/versions` лежат `stats.community.in_collection / in_wantlist` и `major_formats` — этого хватает на `is_hot` и `is_limited` без доп. запросов.
3. **Дешёвые флаги — сразу, дорогие — фоном.** `is_canon` из `master.main_release_id`, `is_limited` из format-токенов, `is_hot` из `stats.community` отдаются юзеру за < 3 сек. `is_collectible` (требует marketplace `price_stats`) досчитывается в фоне и пишется в `master_versions_enriched` Redis-кэш.
4. **Single-flight на фоновое обогащение.** Redis `set_nx`-lock не даёт двум запросам на один и тот же мастер запустить enrichment параллельно — иначе сжигаем rate-limit вдвое быстрее без пользы.
5. **Watchdog везде.** `asyncio.wait_for(timeout=25)` на синхронной части (быстрый 503 вместо 60s axios timeout) и `timeout=120` на фоновом обогащении (не висим вечно при медленном Discogs).
6. **Многослойный кэш.** Сырые ответы Discogs (`release` 7д, `master` 7д, `master_versions` 3д) + enriched-ответы по эндпоинтам (`master_versions_enriched` 3д). Локальная БД `Record` — самый быстрый источник для виденных релизов.
7. **Token-bucket с приоритетами.** `SEARCH > DETAIL > SCAN > ENRICHMENT > BATCH` — пользователь, ждущий поиска прямо сейчас, не стоит за фоновым backfill'ом.

Подробности: [`Backend/app/services/rate_limiter.py`](Backend/app/services/rate_limiter.py), [`Backend/app/services/cache.py`](Backend/app/services/cache.py), [`Backend/app/api/records.py`](Backend/app/api/records.py).

---

## Запуск локально

### Backend

```bash
cd Backend
cp .env.example .env
docker-compose up -d                # рекомендуется
# или: pip install -r requirements.txt && uvicorn app.main:app --reload
```

API: `http://localhost:8000`.

### Mobile

```bash
cd Mobile
npm install
npm start
```

Откройте в Expo Go или симуляторе. Для локального бэкенда укажите свой IP в [Mobile/lib/api.ts](Mobile/lib/api.ts).

---

## Продакшен

- **API**: https://api.vinyl-vertushka.ru/api
- **Хост**: Beget VPS Ubuntu 24.04 (`85.198.85.12`, 8.7 ГБ диск, 10 ГБ тариф)
- **Стек**: Docker Compose (`docker-compose.prod.yml`) + Nginx + 5 контейнеров: api, scheduler, db (Postgres 16), redis, nginx. Metabase убран с прода 2026-05-09 — поднимается локально по требованию.

### Деплой

**Стандартный путь — одна команда:**
```bash
git push origin main
ssh deploy@85.198.85.12 'bash ~/vertushka/Вертушка/Backend/scripts/deploy.sh'
```

`deploy.sh` ([Backend/scripts/deploy.sh](Backend/scripts/deploy.sh)) делает: git pull → pre-flight check свободного места (нужно >1 ГБ, иначе сам почистит) → build api+scheduler из общего Dockerfile → миграции → up -d с **`--force-recreate --no-deps api scheduler`** → healthcheck `/health` 60 сек → `image prune` + `builder prune --reserved-space 500MB`.

### Бэкап БД

Перед любой потенциально опасной операцией (миграция новой схемы, чистка volume, сомнительный SQL):
```bash
ssh deploy@85.198.85.12 'bash ~/vertushka/Вертушка/Backend/scripts/backup.sh'
# дамп → ~/backups/vertushka_YYYYMMDD_HHMMSS.sql.gz, хранится 7 дней
```

### Откат

Если деплой испортил api:
```bash
# 1. вернуть код:
ssh deploy@85.198.85.12 'cd ~/vertushka && git reset --hard <предыдущий-commit-sha>'
# 2. пересобрать:
ssh deploy@85.198.85.12 'bash ~/vertushka/Вертушка/Backend/scripts/deploy.sh'
```
Если миграция испортила БД — восстановить из дампа:
```bash
ssh deploy@85.198.85.12 'gunzip -c ~/backups/vertushka_<timestamp>.sql.gz | docker exec -i vertushka_db psql -U <user> -d vertushka'
```

### Disk hygiene (защита от разрастания)

Активна автоматически — ничего регулярно не делать:
- **Лимит логов всех контейнеров** — 30 МБ rolling buffer (`/etc/docker/daemon.json`).
- **journald** — `SystemMaxUse=200M` (`/etc/systemd/journald.conf`).
- **Weekly auto-prune** — воскресенье 04:00 UTC (`/etc/cron.d/vertushka-disk-cleanup`): `docker system prune -af --filter until=336h` + `apt-get clean`.
- **Disk-alert** — каждые 30 мин, лог `/var/log/disk-alert.log` если `/` >80%.
- **Cover cache cap** — `COVERS_MAX_CACHE_MB=500` в `.env.prod`, LRU-cleanup ежедневно в 03:00.

Проверить состояние диска:
```bash
ssh deploy@85.198.85.12 'df -h / && docker system df && tail -5 /var/log/disk-alert.log'
```

### Локальный Metabase для аналитики

```bash
cd Backend && docker compose up -d metabase
# http://localhost:3000
docker compose stop metabase  # когда закончил
```

### Правила работы с продом

✅ **Можно**:
- Запускать `bash deploy.sh` — он сам проверяет место, бэкапит, делает healthcheck.
- `docker image prune -f`, `docker container prune -f`, `docker builder prune -af` — чистят только мусор.
- Любые правки в `docker-compose.prod.yml` — сервис, env, healthcheck, ports.

❌ **Нельзя без явного намерения** (data loss):
- `docker system prune` **с флагом `--volumes`** — удалит всю БД, обложки, redis-кэш.
- `docker compose down -v` — то же самое (флаг `-v` удаляет volume).
- `docker volume rm backend_postgres_data | backend_uploads_data` — без бэкапа.
- `git reset --hard` без предварительного `git stash` локальных правок на сервере.

⚠️ **Если что-то добавляешь в стек**:
- Новый сервис → правь **И** `docker-compose.prod.yml`, **И** dev `docker-compose.yml`.
- Если сервис должен светиться через nginx — добавь server-блок в [Backend/nginx/nginx.conf](Backend/nginx/nginx.conf), подними SSL через certbot.
- Если сервис собирается из своего Dockerfile — добавь его в `build` секцию `deploy.sh` (сейчас билдятся `api scheduler`).
- Если сервис должен пересоздаваться при деплое — добавь его в `--force-recreate --no-deps` в `deploy.sh`.

---

## Ключевые изменения за последние 2 месяца

Хайлайты по веткам — полный список см. в [ROADMAP.md → Changelog](ROADMAP.md).

**Рарити и цены**
- 3 тира редкости (Коллекционка / Лимитка / Популярно), `RarityAura` glow + backfill (Канон выпилен из UI).
- Компонентная формула RUB-цены вместо фиксированного ×2.5; recalc-скрипт.
- VinylColorTag + анимированный VinylSpinner из Discogs-цвета.

**Подарки и социалка**
- Gift-booking волна 3: анти-фрод, blocked_contacts, email-верификация, reveal_gifter.
- Экран `gift/[id]`, экран «Я дарю / Мне дарят», timeout 15s + понятный фидбек.
- Публичный веб-профиль: fun-stats (14 шт), новинки 24 релиза, sticky CTA, waitlist, auto-rail с pause-on-touch (фикс iOS Safari).

**Авторизация и безопасность**
- Apple Sign In + Google OAuth, circuit breaker для Discogs, Amplitude.
- P0+P1 фиксы из QA-ревью (волны A–D).

**UX и дизайн-система**
- Онбординг v2 (welcome-карусель + 10-шаговый тур).
- Полная миграция Mobile на Icon из design-system v2; outline-иконки лупы/scan, halo wrapper.

**Инфра**
- Скрипт зеркалирования БД в Supabase для аналитики, view'ы.
- ROADMAP.md (M1–M10) + auto-sync changelog через GitHub Actions.
- Уход от N+1 в `/masters/{id}/versions`: `is_hot` теперь считается из `stats.community` master-versions response, `is_collectible` обогащается фоном через `BackgroundTasks` + single-flight Redis-lock. Холодный путь 60+ сек → < 3 сек.

---

## Автор

Один разработчик ([@bamsrf](https://github.com/bamsrf)) + Claude Code. Сделано с любовью к виниловым пластинкам 🎶
