#!/bin/bash
# ===========================================
# Создание read-only роли metabase_ro в Postgres.
# Запускать ОДИН РАЗ после применения миграции 20260505_analytics.
#
# Использование:
#   METABASE_RO_PASSWORD='длинный-случайный-пароль' bash scripts/setup_metabase_role.sh
#
# Подключение в Metabase:
#   Host: db (внутри docker-сети) или 127.0.0.1 (с хоста)
#   Port: 5432
#   Database: vertushka
#   Username: metabase_ro
#   Password: <тот, что задал>
# ===========================================

set -e

if [ -z "$METABASE_RO_PASSWORD" ]; then
    echo "❌ Задайте METABASE_RO_PASSWORD env var" >&2
    exit 1
fi

cd "$(dirname "$0")/.."

COMPOSE_FILE="docker-compose.prod.yml"
if [ ! -f "$COMPOSE_FILE" ]; then
    COMPOSE_FILE="docker-compose.yml"
fi

DB_USER="${DB_USER:-postgres}"

docker compose -f "$COMPOSE_FILE" exec -T -e PGPASSWORD="$DB_PASSWORD" db \
    psql -U "$DB_USER" -d vertushka -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'metabase_ro') THEN
        EXECUTE format('CREATE ROLE metabase_ro LOGIN PASSWORD %L', '$METABASE_RO_PASSWORD');
    ELSE
        EXECUTE format('ALTER ROLE metabase_ro WITH PASSWORD %L', '$METABASE_RO_PASSWORD');
    END IF;
END
\$\$;

GRANT CONNECT ON DATABASE vertushka TO metabase_ro;
GRANT USAGE ON SCHEMA public TO metabase_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO metabase_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO metabase_ro;
SQL

echo "✅ metabase_ro роль готова. Используй её в Metabase (read-only)."
