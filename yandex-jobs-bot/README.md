# Yandex Jobs Telegram Bot

Телеграм-бот, который отслеживает вакансии Яндекса в направлении «Управление проектами и продуктами» и присылает уведомления о новых позициях.

## Что отслеживает

- Product Manager
- Project Manager
- Tech Manager
- Category Manager
- Quality Manager

## Информация в уведомлении

- Название вакансии
- Подразделение (сервис Яндекса)
- Формат работы (офис / гибрид / удалёнка)
- Грейд / требуемый стаж
- Город
- Ссылка на вакансию

## Установка

```bash
# 1. Создай виртуальное окружение
python3 -m venv .venv
source .venv/bin/activate

# 2. Установи зависимости
pip install -r requirements.txt

# 3. Создай .env файл
cp .env.example .env
```

## Настройка

1. Создай бота через [@BotFather](https://t.me/BotFather) и получи токен
2. Узнай свой `chat_id` — запусти бота и отправь `/start`
3. Заполни `.env`:

```
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=123456789
CHECK_INTERVAL_MINUTES=15
```

## Запуск

```bash
python bot.py
```

## Команды бота

- `/start` — приветствие + твой chat_id
- `/check` — проверить вакансии прямо сейчас
- `/status` — статус бота и количество известных вакансий
- `/reset` — сбросить историю (следующая проверка пришлёт все текущие)
