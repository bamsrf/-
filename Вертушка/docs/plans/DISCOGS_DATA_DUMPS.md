# Discogs Data Dumps — план для независимости от API

> Обзор операционки парсинга — в [PARSING.md](../PARSING.md).
> План верхнего уровня (магазины, аффилиаты) — в [SHOPS_PARSING.md](SHOPS_PARSING.md).

## Context — зачем

Сейчас наш matcher для создания новой `records` (когда юзер кликает на пластинку, или когда парсер магазина приносит новый листинг с barcode которого ещё нет в нашей БД) **дёргает Discogs API** через `_try_discogs_fetch` / `_try_discogs_fetch_by_text`. Это создаёт **два бутылочных горлышка**:

1. **Rate limit Discogs API**: 60 req/min на токен. Жёсткий лимит, заплатить за повышение нельзя — Discogs не продаёт premium tier.
2. **Latency**: ~300-500 мс на запрос. При активном backfill 10к листингов один matcher batch занимает часы.

В стационаре после первоначального импорта (когда у нас в магазинах ~100к листингов, и большинство уже сматчены) проблема снижается. Но **на каждом новом магазине** или при перепарсинге у нас всплеск Discogs-запросов.

**Решение**: Discogs официально публикует **полные дампы базы данных** на S3. Если их распарсить и держать **local mirror** таблицы `records` — matcher работает **полностью локально**, без сети, без лимитов. На каждое обновление магазина (10к-100к листингов) — мгновенный матчинг через INDEX lookup по barcode.

---

## 1. Что есть в дампах

Discogs выкладывает 4 типа дампов **каждый месяц 1-го числа** на публичный S3:

```
https://discogs-data-dumps.s3.us-west-2.amazonaws.com/index.html
```

| Файл | Содержит | Размер сжатый | Разжатый |
|---|---|---|---|
| `discogs_YYYYMMDD_releases.xml.gz` | Все releases (пресс/издание) — главное что нам нужно | ~5 ГБ | ~25-30 ГБ |
| `discogs_YYYYMMDD_masters.xml.gz` | Master-releases (объединяют все версии одного альбома) | ~600 МБ | ~3 ГБ |
| `discogs_YYYYMMDD_artists.xml.gz` | Артисты | ~300 МБ | ~1.5 ГБ |
| `discogs_YYYYMMDD_labels.xml.gz` | Лейблы | ~50 МБ | ~250 МБ |

Формат: **XML** (один большой файл на 17-18 млн элементов). Поддерживает stream-парсинг через `lxml.etree.iterparse` — без загрузки всего в память.

### Что мы берём из releases

Каждый `<release>` содержит:
- `@id` → `discogs_id`
- `master_id` → `discogs_master_id`
- `<title>` → название альбома
- `<artists>/<artist>/<name>` → артист
- `<released>` (YYYY-MM-DD) → год
- `<country>` → страна издания
- `<labels>/<label>/@catno` → каталожный номер ⭐ важно для матчинга
- `<identifiers>/<identifier @type="Barcode">` → EAN-13/UPC ⭐ важно для матчинга
- `<formats>/<format @name="Vinyl|CD|Cassette|Box Set">` → формат
- `<images>/<image @type="primary" @uri>` → URL обложки
- `<genres>/<genre>`, `<styles>/<style>` → жанры/стили

**Чего НЕ берём** (раздуло бы БД на ×3-5):
- `<tracklist>` — мы тянем по требованию из API когда юзер открывает запись
- `<videos>`, `<companies>`, `<extraartists>` — не нужно для матчинга/карусели

---

## 2. Покрытие форматов — ВСЕ носители, не только vinyl

Магазины торгуют разными носителями (LP, CD, кассеты, бокс-сеты, картриджи). Нам нужно матчить все, чтобы:
- Карусель «В наличии сейчас» показывала **то что юзер хочет** (винил или CD-коллекционер)
- Поиск по сканер штрихкода работал для любого носителя

Поэтому при импорте dump **фильтруем не по формату**, а **по существованию `<format>`** (исключаем `release` без формата — это битые данные).

| `<format @name>` (Discogs) | Наш `format_type` | Парсить |
|---|---|---|
| `Vinyl` | `LP` или `7"` (по `<format @qty>` и `<format/descriptions>`) | ✅ |
| `CD` | `CD` | ✅ |
| `Cassette` | `Cassette` | ✅ |
| `Box Set` (как контейнер) | `Box Set` | ✅ |
| `File` (digital) | `File` | ✅ (для completeness, но скорее всего не появится в магазинах) |
| `Hybrid` | `Hybrid` (SACD/CD) | ✅ |
| `Reel-To-Reel`, `8-Track`, `DAT`, `MiniDisc` | как есть | ✅ (на случай редких releases) |

**Расчёт**: на 18 млн releases в полной базе разбивка примерно:
- Vinyl: ~5-7 млн
- CD: ~7-8 млн
- Cassette: ~1.5-2 млн
- Box Set / прочее: ~1 млн

Итого **~15-17 млн нужных записей**. Если фильтровать только Vinyl — теряем ~60% полезных данных для магазинов где есть CD/Cassette.

---

## 3. Архитектура импорта

```
            ┌──────────────────────────┐
            │  Discogs S3 dump (XML.gz)│  ~5 ГБ download раз в месяц
            └──────────┬───────────────┘
                       │ stream download
                       ▼
            ┌──────────────────────────┐
            │  lxml.etree.iterparse    │  stream parse XML (no full load)
            │  + tag='release'         │
            └──────────┬───────────────┘
                       │ для каждого release:
                       ▼
            ┌──────────────────────────┐
            │  to_record(release)      │  extract нужные поля
            └──────────┬───────────────┘
                       │ batch 1000
                       ▼
            ┌──────────────────────────┐
            │  PG COPY FROM STDIN      │  bulk insert ON CONFLICT
            │  ON CONFLICT(discogs_id) │  DO UPDATE для месячных дельт
            │  DO UPDATE               │
            └──────────────────────────┘
```

**Поэтапно**:

### Phase 0 — Foundation (1 день)

1. CLI `python -m app.scripts.import_discogs_dump --type=releases --file=...`
2. Скачивание: `aria2c` или `httpx.stream()` с прогресс-баром
3. Декомпрессия: `gzip.open(stream)` — не разжимать на диск
4. Парсер: `lxml.etree.iterparse(stream, events=('end',), tag='release')` + `elem.clear()` после обработки (память константа ~200 МБ)
5. Маппинг XML → dict (`to_record_dict()`)
6. Batch UPSERT в `records` через `INSERT ... ON CONFLICT (discogs_id) DO UPDATE`

### Phase 1 — Первый full import (1 день)

1. Скачать последний дамп `releases` (~5 ГБ)
2. Запустить import — пишет в БД через batch 1000
3. **Время**: ~3-6 часов на 18 млн записей (зависит от disk I/O)
4. **Результат**: ~3-5 ГБ в таблице `records` (только нужные поля)

### Phase 2 — Monthly refresh (cron)

1. Cron 1-го числа в 04:00: cкачать новый dump
2. Сравнить с предыдущим (по дате в filename) — обработать **только новые** records (Discogs выпускает delta-сравнение)
3. На месяц ~50-100к новых releases → импорт ~30-60 мин
4. Идемпотентность: `ON CONFLICT DO UPDATE` на случай если запись изменилась

### Phase 3 — Снос зависимости от on-demand API

После Phase 1+2:
- `listing_matcher._try_discogs_fetch` (шаг 5 каскада) → **отключить** (или оставить как ultimate fallback на случай новейших releases которые ещё не в dump)
- `_try_discogs_fetch_by_text` (шаг 5b) → можно оставить как fallback, но в большинстве случаев barcode/catalog в dump уже есть
- `DISCOGS_FETCH_HOURLY_LIMIT` опустить до 50 (только для live-поиска юзера)

---

## 4. Storage — что в БД

```sql
-- Schema records уже есть (см. Backend/app/models/record.py).
-- Импорт не требует миграций, только добавление строк.

ALTER TABLE records
    ADD COLUMN IF NOT EXISTS imported_from_dump_date date;
-- Полезно для дебага: знать что эта запись из импорта vs от юзера/API

CREATE INDEX IF NOT EXISTS ix_records_barcode_when_set ON records (barcode)
    WHERE barcode IS NOT NULL;
-- Частичный индекс — для быстрого поиска при матчинге (только записи с barcode)
```

| Что | Размер |
|---|---|
| `records` после full import | ~15 млн строк × ~200 байт = **~3 ГБ** |
| Индексы (`discogs_id` unique, `barcode` partial, `master_id`, `title` pg_trgm) | ~1.5 ГБ |
| **Итого + текущая БД (~30 МБ)** | **~5 ГБ** |

Сервер `85.198.85.12` сейчас имеет PG 16 на отдельном volume. Запас на десятки ГБ. Стоит проверить `df -h` на проде перед импортом.

---

## 5. Риски и сложности

### A. Размер дампа (5 ГБ download → 25 ГБ XML)

- **Риск**: исчерпание места на сервере. PG datafiles + temp files на парсинге.
- **Митигация**:
  - Не разжимать на диск — стримить из gzip напрямую в iterparse
  - Удалять старые дампы после обработки
  - Перед запуском: `df -h /var/lib/postgresql` → нужно ≥10 ГБ свободного

### B. Производительность импорта

- **Риск**: 18 млн INSERT'ов = часы. Если делать построчно — дни.
- **Митигация**:
  - Batch 1000 через `INSERT ... VALUES (...), (...), ...` или `COPY FROM STDIN` (быстрее в 10×)
  - Отключить триггеры на время импорта (`SET session_replication_role = replica`)
  - Drop+recreate индексы после массового импорта (быстрее чем поддерживать на insert)
  - Использовать `UNLOGGED` table → потом `ALTER TABLE SET LOGGED` (рискованно при crash, но дешевле)

### C. Совместимость схемы

- **Риск**: наша `records` таблица сейчас допускает `discogs_id NULL` (для записей которые юзер создал вручную). Импорт всегда даёт `discogs_id NOT NULL`. UNIQUE INDEX на `discogs_id` есть — конфликты по UPSERT отработают.
- **Митигация**: проверить тип всех полей (string vs int), nullable, длина (varchar limits).

### D. Изменение схемы XML между месяцами

- **Риск**: Discogs обновляет формат XML (редко, но было в 2019, 2022). Поломает парсер.
- **Митигация**:
  - Schema-version regex в filename
  - Smoke-test: после импорта проверить случайные 10 записей через API — совпадают ли поля
  - Fallback: оставить on-demand fetch для тех записей где импорт упал

### E. Свежесть данных (delay месяц)

- **Риск**: Discogs dump — snapshot 1-го числа. Если 15-го числа на Discogs появилась новая запись (юзер создал) — мы её не увидим до следующего dump через 2 недели.
- **Митигация**: оставить on-demand fetch (`_try_discogs_fetch`) **как fallback** — если record по `discogs_id` не нашёлся → пробуем API. Это редкий путь после Phase 1.

### F. Покрытие форматов — Vinyl vs CD vs Cassette

- **Риск**: если случайно фильтрнём `format='Vinyl'` при импорте — потеряем 60% полезных данных. У магазинов есть CD, кассеты, боксы.
- **Митигация**:
  - Импортировать **все форматы** (без фильтра по `<format>`)
  - Хранить `format_type` как пришло из dump (например, «LP», «12"», «CD», «Cassette», «Box Set»)
  - В matcher не фильтровать по формату при поиске barcode (один barcode = один конкретный formate, и так совпадёт)
  - **Исключение**: можно отбросить очень редкие как `8-Track`, `DAT` если совсем хочется экономить место (~100к записей)

### G. Лицензия и юр.риск

- **Информация**: Discogs Data Dumps под лицензией [CC0 Public Domain](https://www.discogs.com/developers/#page:database-download). Можно использовать в любых целях коммерчески.
- **Атрибуция**: не требуется, но **рекомендуется** добавить «Powered by Discogs» в Mobile UI (мы и так это собираемся показывать в `OffersBlock`).

### H. Обновление = пересчёт matcher на старых unmatched

- **Риск**: после Phase 1 у нас в БД могут быть unmatched листинги которые **до** импорта матчер не нашёл. После импорта records гораздо больше — нужно перепрогнать matcher на всё.
- **Митигация**:
  - Один раз после Phase 1: `python -m app.scripts.scrape_all --match-only --batch=10000`
  - 10к листингов × ~50мс на матч = ~10 минут (in-memory lookup быстрее API)

### I. Memory pressure при парсинге

- **Риск**: `lxml.etree.iterparse` может накапливать память если не звать `elem.clear()` и не удалять предков.
- **Митигация**: классический паттерн:
  ```python
  for event, elem in iterparse(stream, events=('end',), tag='release'):
      yield to_record_dict(elem)
      elem.clear()
      while elem.getprevious() is not None:
          del elem.getparent()[0]
  ```
- Контролируем через `psutil.Process().memory_info().rss` — должно быть стабильно ~200 МБ.

---

## 6. Поэтапный план реализации

| Phase | Что | Время |
|---|---|---|
| **Phase 0 — Foundation** | CLI скелет, скачивание, stream-парсер, dry-run на 100 records | 1 день |
| **Phase 1 — First import** | Полный импорт actual dump (~18 млн records). Verify counts | 6-8 часов (включая monitoring) |
| **Phase 2 — Cron monthly** | Cron 1-го числа: download → diff → batch update | 1 день |
| **Phase 3 — Snose on-demand** | Удалить/ослабить `_try_discogs_fetch` пути в matcher | 1 час |
| **Phase 4 (опц)** — Master & Artist import | Дамп `masters.xml` (для alt-version detection) + `artists.xml` (для thumbs) | 2 дня |

**Суммарно**: ~1 неделя инженерной работы. Окупаемость: навсегда отвязаны от Discogs API на массовом матчинге.

---

## 7. Файлы (плановые)

```
Backend/
├── app/
│   ├── scripts/
│   │   └── import_discogs_dump.py        ← новый CLI
│   ├── services/
│   │   └── discogs_dump/                  ← новый модуль
│   │       ├── __init__.py
│   │       ├── downloader.py              ← S3 download + gzip stream
│   │       ├── parser.py                  ← lxml iterparse → dict generator
│   │       ├── importer.py                ← batch UPSERT в records
│   │       └── refresh.py                 ← month delta-обновление
│   ├── tasks/
│   │   └── discogs_dump_tasks.py          ← cron: monthly_dump_refresh
│   └── alembic/versions/
│       └── YYYY_add_records_imported_from.py  ← добавление imported_from_dump_date
└── tests/
    └── discogs_dump/
        ├── fixtures/
        │   └── sample_release.xml         ← один реальный <release> для unit-теста
        └── test_parser.py
```

---

## 8. Verification

После Phase 1:

1. **Count check**: `SELECT count(*) FROM records WHERE imported_from_dump_date IS NOT NULL` — должно быть ~15-18 млн
2. **Barcode coverage**: `SELECT count(*) FROM records WHERE barcode IS NOT NULL` — обычно ~70% records имеют barcode
3. **Format распределение**: `SELECT format_type, count(*) FROM records GROUP BY format_type ORDER BY 2 DESC LIMIT 20` — должны быть LP/CD/Cassette/Box Set в топе
4. **Live matcher test**: перепрогнать `--match-only --batch=10000` на текущих unmatched. Coverage **должен подскочить с ~5% до 70-90%**.
5. **Sample queries**:
   - Поиск «Khruangbin Mordechai» через `/api/records/search` — должны быть все 5+ пресов
   - Поиск по barcode `0656605149318` (например, Khruangbin Mordechai пресс 2020) — должна найтись запись с правильным master_id

После Phase 3:

- Mobile-карусель «В наличии сейчас» имеет ≥100 листингов
- Запросы в Discogs API через `_try_discogs_fetch` идут **только при поиске юзером** (нечасто)
- Cron `hourly_match_unmatched` отрабатывает за **секунды** (lookup из local records, без сети)

---

## 9. Альтернатива — гибридный режим (если не хотим импортить всё)

Можно держать **только subset** dump: только записи **с barcode** (~70% от 18 млн = ~12 млн). Это снизит storage с 5 ГБ до ~3.5 ГБ и сохранит 90% полезности (matcher идёт по barcode в первую очередь).

Или: **only popular** — фильтровать по `have_count > N` (популярность). На записях которые никто не имеет вряд ли будут листинги в наших магазинах. Так можно ужать до 5-7 млн самых ходовых записей (~1.5 ГБ).

---

## 10. Связанные документы

- [PARSING.md](../PARSING.md) — текущая операционка
- [SHOPS_PARSING.md](SHOPS_PARSING.md) — план магазинов
- [OFFERS_UX.md](OFFERS_UX.md) — UI карусели/Hot Stock
- Discogs Developers: https://www.discogs.com/developers/#page:database-download
- Discogs Data Dumps Index: https://discogs-data-dumps.s3.us-west-2.amazonaws.com/index.html
