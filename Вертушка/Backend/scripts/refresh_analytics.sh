#!/bin/bash
# ===========================================
# Перерасчёт materialized views аналитики
# Запускать по cron (раз в час) на проде:
#   0 * * * * cd ~/vertushka/Вертушка/Backend && bash scripts/refresh_analytics.sh >> /var/log/vertushka_analytics.log 2>&1
# ===========================================

set -e

cd "$(dirname "$0")/.."

# Прокидываем команду в контейнер с БД через api контейнер (asyncpg недоступен в bash)
COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi

REFRESH_SQL=$(cat <<'EOF'
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_dau_wau_mau_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_signup_funnel_daily;
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_gift_funnel_daily;
EOF
)

docker compose -f "$COMPOSE_FILE" exec -T db \
    psql -U "${DB_USER:-postgres}" -d vertushka -v ON_ERROR_STOP=1 -c "$REFRESH_SQL"

echo "[$(date -Iseconds)] analytics MVs refreshed"
