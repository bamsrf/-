#!/bin/bash
# ===========================================
# Скрипт деплоя Вертушка API
# ===========================================

set -e  # Остановить при ошибке

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🚀 Начинаю деплой Вертушка API...${NC}"

# Перейти в директорию проекта
cd ~/vertushka

# Сохранить локальные изменения перед pull (если есть)
if ! git diff-index --quiet HEAD --; then
    echo "💾 Сохраняю локальные изменения..."
    git stash push -m "Auto-stash before deploy $(date +%Y-%m-%d_%H:%M:%S)"
    STASHED=true
else
    STASHED=false
fi

# Получить последние изменения
echo "📥 Получаю обновления из git..."
git pull

# Попытаться применить сохранённые изменения обратно (если были)
if [ "$STASHED" = true ]; then
    echo "🔄 Пытаюсь применить сохранённые изменения..."
    if git stash pop 2>/dev/null; then
        echo "✅ Локальные изменения успешно применены"
    else
        echo "⚠️  Не удалось автоматически применить локальные изменения (возможны конфликты)"
        echo "   Используйте 'git stash list' и 'git stash show' для просмотра"
    fi
fi

# Перейти в Backend
cd Вертушка/Backend

# Сборка нового образа
echo "🔨 Собираю Docker образ..."
docker compose -f docker-compose.prod.yml build api

# Запуск контейнеров
echo "🐳 Перезапускаю контейнеры..."
docker compose -f docker-compose.prod.yml up -d

# Применение миграций
echo "📊 Применяю миграции базы данных..."
docker compose -f docker-compose.prod.yml exec -T -e PYTHONPATH=/app api alembic upgrade head

# Очистка старых образов
echo "🧹 Очищаю старые Docker образы..."
docker image prune -f

echo -e "${GREEN}✅ Деплой завершён успешно!${NC}"

# Показать статус
echo ""
echo "📊 Статус контейнеров:"
docker compose -f docker-compose.prod.yml ps
