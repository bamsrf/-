#!/bin/bash
# ===========================================
# Зеркалирование боевой БД Вертушки в локальный Supabase.
#
# Использование:
#   bash scripts/mirror_prod_to_local.sh
#
# Что делает:
#   1. pg_dump public-схемы с VPS (только данные + DDL, без секретов)
#   2. Фильтрует PG16-команды (\restrict, CREATE SCHEMA public)
#      для совместимости с локальным PG15
#   3. Загружает в локальный Supabase (postgres@localhost:54322)
#   4. Рефрешит materialized views для свежей аналитики
#
# Открыть Studio:  http://localhost:54323
# ===========================================

set -e

VPS="deploy@85.198.85.12"
LOCAL_CONTAINER="supabase_db_vertushka"

echo "[$(date +%H:%M:%S)] 🔄 Зеркалирую боевую БД в локальный Supabase..."

if ! docker ps --format '{{.Names}}' | grep -q "^${LOCAL_CONTAINER}$"; then
    echo "❌ Локальный Supabase не запущен. Сначала: cd Вертушка && npx supabase start"
    exit 1
fi

# pg_dump из VPS → фильтр → psql в локальный контейнер
ssh "$VPS" "cd ~/vertushka/Вертушка/Backend && \
    DBU=\$(grep '^DB_USER=' .env.prod | cut -d= -f2-) && \
    docker compose -f docker-compose.prod.yml exec -T db pg_dump \
        -U \"\$DBU\" -d vertushka \
        --schema=public --no-owner --no-acl --quote-all-identifiers 2>/dev/null" \
| sed -E \
    -e '/^\\(restrict|unrestrict) /d' \
    -e '/^CREATE SCHEMA "?public"?;/d' \
    -e '/^COMMENT ON SCHEMA "?public"?/d' \
| docker exec -i "$LOCAL_CONTAINER" psql -U postgres -d postgres \
    --set client_min_messages=warning 2>&1 \
| tail -5

# Refresh materialized views
docker exec "$LOCAL_CONTAINER" psql -U postgres -d postgres -q <<'SQL'
REFRESH MATERIALIZED VIEW mv_dau_wau_mau_daily;
REFRESH MATERIALIZED VIEW mv_signup_funnel_daily;
REFRESH MATERIALIZED VIEW mv_gift_funnel_daily;
SQL

# Re-create browse_* views (pg_dump их каждый раз сносит)
docker exec -i "$LOCAL_CONTAINER" psql -U postgres -d postgres --set ON_ERROR_STOP=1 \
    < "$(dirname "$0")/local_browse_views.sql" > /dev/null 2>&1 \
    && echo "✓ browse_* views пересозданы"

# Counts
docker exec "$LOCAL_CONTAINER" psql -U postgres -d postgres -t -A -c "
SELECT 'users=' || count(*) FROM public.users UNION ALL
SELECT 'collections=' || count(*) FROM public.collections UNION ALL
SELECT 'items=' || count(*) FROM public.collection_items UNION ALL
SELECT 'records=' || count(*) FROM public.records UNION ALL
SELECT 'gifts=' || count(*) FROM public.gift_bookings UNION ALL
SELECT 'follows=' || count(*) FROM public.follows UNION ALL
SELECT 'views=' || count(*) FROM pg_views WHERE schemaname='public'"

echo "[$(date +%H:%M:%S)] ✅ Готово. Открой Studio: http://localhost:54323"
