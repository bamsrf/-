# Локальная разработка Вертушка Backend.
# Использует supabase-cli для Postgres + docker-compose для Redis.
#
# Быстрый старт:
#   make dev-up           # поднять Supabase + Redis
#   make migrate          # накатить Alembic-миграции
#   make seed             # засеять магазины (Store)
#   make run              # запустить FastAPI на :8000
#   make scrape-test      # пилотный прогон парсера korobkavinyla (10 товаров)
#
# Подробности: docs/dev/DEV_SETUP_LOCAL.md

.PHONY: help dev-up dev-down dev-status migrate downgrade seed run shell scrape-test scrape-match psql studio clean

PYTHON := ./venv/bin/python
PIP := ./venv/bin/pip
SUPABASE_DIR := ../supabase

help:  ## показать список команд
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

# ---- Инфраструктура ---------------------------------------------------- #

dev-up:  ## supabase start + docker compose up redis
	cd $(SUPABASE_DIR)/.. && supabase start
	docker compose -f docker-compose.dev.yml up -d
	@echo ""
	@echo "✅ Локальная среда поднята:"
	@echo "   Postgres:  postgresql://postgres:postgres@127.0.0.1:54322/postgres"
	@echo "   Redis:     redis://localhost:6379"
	@echo "   Studio:    http://127.0.0.1:54323"

dev-down:  ## остановить supabase + redis
	docker compose -f docker-compose.dev.yml down
	cd $(SUPABASE_DIR)/.. && supabase stop

dev-status:  ## статус контейнеров
	cd $(SUPABASE_DIR)/.. && supabase status
	docker compose -f docker-compose.dev.yml ps

studio:  ## открыть Supabase Studio в браузере
	open http://127.0.0.1:54323

# ---- БД и миграции ----------------------------------------------------- #

migrate:  ## alembic upgrade head
	$(PYTHON) -m alembic upgrade head

downgrade:  ## alembic downgrade -1
	$(PYTHON) -m alembic downgrade -1

psql:  ## открыть psql к локальной БД
	PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres

# ---- Сидинг ----------------------------------------------------------- #

seed:  ## засеять магазины (Store)
	$(PYTHON) -m app.scripts.seed_stores

seed-list:  ## показать что засеется (без записи)
	$(PYTHON) -m app.scripts.seed_stores --list

# ---- Парсер ----------------------------------------------------------- #

scrape-test:  ## пилотный прогон korobkavinyla (10 товаров)
	$(PYTHON) -m app.scripts.scrape_all --slug=korobkavinyla --limit=10

scrape-list:  ## список зарегистрированных парсеров и магазинов
	$(PYTHON) -m app.scripts.scrape_all --list

scrape-match:  ## только сматчить unmatched листинги
	$(PYTHON) -m app.scripts.scrape_all --match-only

# ---- API server -------------------------------------------------------- #

run:  ## запустить FastAPI на :8000 с reload
	$(PYTHON) -m uvicorn app.main:app --reload --port 8000

# ---- Прочее ----------------------------------------------------------- #

install:  ## pip install requirements
	$(PIP) install -r requirements.txt

shell:  ## интерактивный python shell с подгруженным app
	$(PYTHON) -c "import asyncio; from app.database import async_session_maker; print('async_session_maker готов')"; $(PYTHON)

clean:  ## удалить кэш питона
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
