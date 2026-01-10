#!/bin/bash
# ===========================================
# Скрипт автоматического бэкапа PostgreSQL
# Вертушка API
# ===========================================

# Настройки
BACKUP_DIR="$HOME/backups"
CONTAINER_NAME="vertushka_db"
DB_USER="vertushka_user"
DB_NAME="vertushka"
DAYS_TO_KEEP=7

# Цвета для вывода
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Создать директорию если не существует
mkdir -p $BACKUP_DIR

# Имя файла с датой
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/vertushka_${TIMESTAMP}.sql.gz"

echo "$(date): Начинаю бэкап базы данных..."

# Создать бэкап и сжать
docker exec $CONTAINER_NAME pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_FILE

# Проверить успешность
if [ $? -eq 0 ] && [ -s "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}$(date): ✅ Бэкап создан: $BACKUP_FILE ($SIZE)${NC}"
    
    # Удалить старые бэкапы (старше DAYS_TO_KEEP дней)
    DELETED=$(find $BACKUP_DIR -name "vertushka_*.sql.gz" -mtime +$DAYS_TO_KEEP -delete -print | wc -l)
    if [ $DELETED -gt 0 ]; then
        echo "$(date): 🗑️  Удалено старых бэкапов: $DELETED"
    fi
    
    # Показать список текущих бэкапов
    echo "$(date): 📁 Текущие бэкапы:"
    ls -lh $BACKUP_DIR/vertushka_*.sql.gz 2>/dev/null | tail -5
    
    exit 0
else
    echo -e "${RED}$(date): ❌ ОШИБКА создания бэкапа!${NC}"
    # Удалить пустой файл если создался
    [ -f "$BACKUP_FILE" ] && rm "$BACKUP_FILE"
    exit 1
fi
