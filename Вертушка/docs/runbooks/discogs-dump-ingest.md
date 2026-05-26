# Runbook: ingest Discogs Releases Dump

> Одноразовая операция. После апгрейда VPS до 30 GB и применения миграции
> `20260527_dump_idx`. Повторять раз в 3–6 месяцев со свежим дампом.

## Что произойдёт

После ingest'а:
- `discogs_releases_index` таблица содержит ~16M slim-записей релизов (~3.5 GB heap).
- Индексы: btree на barcode/catalog/master_id + GIN trigram на artist/title (~3 GB).
- Matcher новых листингов получает шаг **4.5 (dump lookup)** перед on-demand Discogs API. Покрытие vinyl_ru/stoprobotvinyl с 0.9–11% → 80%+.

## Pre-flight (5 минут)

### 1. Проверить место на сервере

```bash
ssh deploy@85.198.85.12 'df -h / && docker system df'
```

Должно быть **≥ 18 GB свободно** (8 GB на XML + 7 GB БД + 3 GB запас).

### 2. Применить миграцию `20260527_dump_idx`

Если последний deploy ещё её не применил:

```bash
ssh deploy@85.198.85.12 'bash ~/vertushka/Вертушка/Backend/scripts/deploy.sh'
```

Проверить:

```bash
ssh deploy@85.198.85.12 'docker compose -f ~/vertushka/Вертушка/Backend/docker-compose.prod.yml exec -T db psql -U vertushka -d vertushka_db -c "\dt discogs_releases_index"'
```

Таблица должна существовать (пустая).

## Ingest (3–5 часов)

### 1. Скачать дамп

Discogs выпускает дампы ~1 числа каждого месяца, лежат на S3.

```bash
ssh deploy@85.198.85.12 'cd /tmp && \
  wget --progress=dot:giga \
  https://discogs-data-dumps.s3-us-west-2.amazonaws.com/data/2026/discogs_20260501_releases.xml.gz'
```

~7–8 GB, на 100 Мбит/с — 10–15 минут.

### 2. Скопировать дамп в контейнер api

```bash
ssh deploy@85.198.85.12 'docker cp /tmp/discogs_20260501_releases.xml.gz vertushka_api:/tmp/'
```

### 3. Запустить ingest в фоне

```bash
ssh deploy@85.198.85.12 'docker exec -d vertushka_api sh -c "\
  python -m app.scripts.ingest_discogs_dump \
    --file /tmp/discogs_20260501_releases.xml.gz \
    --dump-date 2026-05-01 \
    --batch-size 5000 \
    > /tmp/ingest.log 2>&1"'
```

Параметры (когда они нужны):

- `--limit 10000` — для теста на маленьком объёме (заполнит ~10k записей и выйдет).
- `--resume-from 123456` — если упало в середине, продолжить с заданного `discogs_id`.
- `--skip-existing` — при повторном запуске (ON CONFLICT DO NOTHING).
- `--build-indexes-only` — пропустить ingest, только построить индексы.

### 4. Мониторить прогресс

```bash
ssh deploy@85.198.85.12 'docker exec vertushka_api tail -f /tmp/ingest.log'
```

Каждые 30 секунд скрипт логирует:
```
progress: parsed=2400000 inserted=2400000 skipped=180000 errors=0 rate=5200/s
```

Ориентир: 5000 rows/sec на 1 ядре → 16M записей ≈ **55 минут чистого парсинга**.
Плюс index build (CONCURRENTLY): ~1–2 часа на GIN trigram. **Итого 2–4 часа.**

### 5. Проверить результат

```bash
# Кол-во записей
ssh deploy@85.198.85.12 'docker compose -f ~/vertushka/Вертушка/Backend/docker-compose.prod.yml exec -T db psql -U vertushka -d vertushka_db -c "SELECT COUNT(*) FROM discogs_releases_index"'
# → ожидаем ~15-17M

# Проверка индексов
ssh deploy@85.198.85.12 'docker compose -f ~/vertushka/Вертушка/Backend/docker-compose.prod.yml exec -T db psql -U vertushka -d vertushka_db -c "\di discogs_releases_index"'
# → должно быть: PK, ix_dri_barcode, ix_dri_catalog, ix_dri_master_id, ix_dri_artist_trgm, ix_dri_title_trgm

# Sanity check: ищем известный барcode
ssh deploy@85.198.85.12 'docker compose -f ~/vertushka/Вертушка/Backend/docker-compose.prod.yml exec -T db psql -U vertushka -d vertushka_db -c "SELECT discogs_id, artist, title FROM discogs_releases_index WHERE barcode_norm = '\''0656605149318'\''"'
# → должна выдать строку
```

### 6. Cleanup

```bash
ssh deploy@85.198.85.12 'docker exec vertushka_api rm /tmp/discogs_20260501_releases.xml.gz'
ssh deploy@85.198.85.12 'rm /tmp/discogs_20260501_releases.xml.gz'
ssh deploy@85.198.85.12 'df -h /'
```

## Post-ingest

После того как индекс заполнен, matcher автоматически начнёт его использовать
(см. `listing_matcher._is_dump_available` — in-process cache, обновится при
рестарте API). Чтобы немедленно подхватить:

```bash
ssh deploy@85.198.85.12 'docker compose -f ~/vertushka/Вертушка/Backend/docker-compose.prod.yml restart api scheduler'
```

### Мониторинг match-rate

```sql
-- За последние 24 часа: какие методы матча сработали
SELECT match_method, COUNT(*)
FROM store_listings
WHERE matched_at >= now() - interval '24 hours'
GROUP BY match_method
ORDER BY count DESC;
```

После ingest'а ожидаем:
- `dump_index`: 60–80% всех новых матчей
- `barcode`/`catalog`: 5–15% (когда листинг уже в локальных records)
- `discogs_fetch`: < 5% (только новинки после даты дампа)

### Cron `hourly_match_unmatched` (уже работает)

Каждый час пробегает до 2000 unmatched листингов. После ingest'а большая
часть существующих unmatched (vinyl_ru, stoprobotvinyl) подцепятся за
2–3 итерации (≈ 2–3 часа). Через сутки match-rate всех магазинов ≥ 80%.

### Cron `daily_rematch_store_native` (уже работает)

Каждый день в 03:30 UTC проходит по store-native записям. Те что найдут
match в свежем дампе → safe_merge → запись становится полноценной.

## Что делать если упало

| Симптом | Причина | Решение |
|---|---|---|
| `No space left on device` | Диск переполнился | Удалить XML, остановить ingest, увеличить диск |
| `OOM Killed` | RAM 2GB упёрся при создании GIN trigram | Запустить с `--build-indexes-only` после restart, остановить API на время |
| `UniqueViolation discogs_id` | Повторный запуск без флага | Добавить `--skip-existing` |
| `Connection terminated unexpectedly` | Postgres timeout | Проверить логи docker compose logs db, увеличить statement_timeout |
| Ingest идёт > 6 часов | Тормозят индексы при вставке (миграция случайно создала их сразу) | Дропнуть индексы, выполнить ingest без них, потом `--build-indexes-only` |

## Откат

```sql
-- Полностью убрать дамп (matcher автоматически вернётся к старому каскаду)
DROP TABLE discogs_releases_index CASCADE;
```

или через `alembic downgrade 20260526_dedup_idx`. После этого `_is_dump_available`
вернёт false, и matcher пропустит шаг 4.5.

## Следующий дамп

Через 3–6 месяцев — повторить процедуру со свежим `discogs_YYYYMMDD_releases.xml.gz`.
Скрипт поддерживает upsert через `--skip-existing` (новые записи добавляются,
существующие не дублируются). Если хочется полное обновление — сначала
`TRUNCATE discogs_releases_index`, потом ingest без `--skip-existing`.

`dump_version` колонка показывает дату каждого набора — мониторить через:

```sql
SELECT dump_version, COUNT(*) FROM discogs_releases_index GROUP BY dump_version;
```
