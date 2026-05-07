#!/bin/bash
# ===========================================
# Зеркалирование БД Вертушки в Supabase.
#
# Делает full dump public-схемы из VPS-Postgres и восстанавливает в Supabase
# (с --clean --if-exists — каждый запуск перезаписывает данные).
#
# Использование:
#   1. Задай SUPABASE_DB_URL в окружении (см. ниже).
#   2. Запусти: bash scripts/mirror_to_supabase.sh
#   3. Для регулярного зеркалирования — добавь в cron (раз в час):
#        0 * * * * cd ~/vertushka/Вертушка/Backend && \
#          SUPABASE_DB_URL='postgres://...' bash scripts/mirror_to_supabase.sh \
#          >> /var/log/vertushka_mirror.log 2>&1
#
# Где взять SUPABASE_DB_URL:
#   Supabase Dashboard → Project Settings → Database → Connection string → "Direct connection"
#   Формат: postgresql://postgres:PASS@db.<ref>.supabase.co:5432/postgres
# ===========================================

set -e

if [ -z "$SUPABASE_DB_URL" ]; then
    echo "❌ Не задан SUPABASE_DB_URL" >&2
    echo "   Установи: export SUPABASE_DB_URL='postgresql://postgres:PASS@db.xxx.supabase.co:5432/postgres'" >&2
    exit 1
fi

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi

DB_USER="${DB_USER:-postgres}"
TS="$(date -Iseconds)"

echo "[$TS] 🔄 Старт зеркалирования VPS → Supabase"

# Дамп public-схемы из VPS-контейнера, restore прямо в Supabase через pipe.
# --no-owner / --no-acl — Supabase использует свои роли, не VPS-овские.
# --clean --if-exists — DROP'аем существующие таблицы перед восстановлением.
# --schema=public — НЕ трогаем supabase-managed схемы (auth, storage, realtime...).
docker compose -f "$COMPOSE_FILE" exec -T db \
    pg_dump \
        -U "$DB_USER" \
        -d vertushka \
        --schema=public \
        --no-owner \
        --no-acl \
        --clean \
        --if-exists \
        --quote-all-identifiers \
    | psql "$SUPABASE_DB_URL" \
        --quiet \
        --set ON_ERROR_STOP=1 \
        --set client_min_messages=warning

echo "[$(date -Iseconds)] ✅ Зеркалирование завершено"

# Sanity check: считаем юзеров на обеих сторонах
SRC_USERS=$(docker compose -f "$COMPOSE_FILE" exec -T db \
    psql -U "$DB_USER" -d vertushka -t -A -c "SELECT count(*) FROM users")
DST_USERS=$(psql "$SUPABASE_DB_URL" -t -A -c "SELECT count(*) FROM users")

echo "[$(date -Iseconds)] 👤 VPS users: $SRC_USERS, Supabase users: $DST_USERS"

if [ "$SRC_USERS" != "$DST_USERS" ]; then
    echo "[$(date -Iseconds)] ⚠️ ВНИМАНИЕ: количество юзеров не совпадает!" >&2
    exit 1
fi
