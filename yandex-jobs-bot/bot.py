import json
import logging
import os
from pathlib import Path

from dotenv import load_dotenv
from telegram import Bot, BotCommand, Update
from telegram.ext import Application, CommandHandler, ContextTypes
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from scraper import Vacancy, fetch_vacancies

load_dotenv()

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")
CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL_MINUTES", "15"))

SEEN_FILE = Path(__file__).parent / "seen_vacancies.json"
ENV_FILE = Path(__file__).parent / ".env"


def load_seen() -> set[str]:
    if SEEN_FILE.exists():
        return set(json.loads(SEEN_FILE.read_text()))
    return set()


def save_seen(seen: set[str]) -> None:
    SEEN_FILE.write_text(json.dumps(sorted(seen), ensure_ascii=False, indent=2))


SERVICE_EMOJI: dict[str, str] = {
    "маркет": "🛒",
    "market": "🛒",
    "такси": "🚕",
    "go": "🚕",
    "еда": "🍔",
    "лавка": "🛍️",
    "доставка": "📦",
    "директ": "📣",
    "реклам": "📣",
    "adv": "📣",
    "облак": "☁️",
    "cloud": "☁️",
    "музык": "🎵",
    "music": "🎵",
    "карт": "🗺️",
    "maps": "🗺️",
    "поиск": "🔍",
    "search": "🔍",
    "финанс": "💳",
    "pay": "💳",
    "банк": "💳",
    "образован": "📚",
    "учебник": "📚",
    "edu": "📚",
    "путешеств": "✈️",
    "travel": "✈️",
    "плюс": "⭐",
    "plus": "⭐",
    "здоровь": "🏥",
    "медиа": "📺",
    "видео": "📺",
    "кино": "📺",
    "браузер": "🌐",
    "browser": "🌐",
    "недвижим": "🏠",
    "авто": "🚗",
    "вертикал": "🏠",
    "алиса": "🤖",
    "alice": "🤖",
    "умный": "🤖",
    "голос": "🤖",
    "игр": "🎮",
    "game": "🎮",
    "weather": "⛅",
    "погод": "⛅",
    "hr": "👥",
    "найм": "👥",
    "рекрутинг": "👥",
}


def get_service_emoji(service: str) -> str:
    service_lower = service.lower()
    for keyword, emoji in SERVICE_EMOJI.items():
        if keyword in service_lower:
            return emoji
    return "🏢"


def format_vacancy(v: Vacancy) -> str:
    service_emoji = get_service_emoji(v.service)
    lines = [
        f"🆕 <b>{v.title}</b>",
        "",
        f"{service_emoji} <b>{v.service}</b>",
        f"🖥️ {v.work_format}",
        f"📍 {v.cities}",
        f"📊 {v.grade}",
        "",
        f'🔗 <a href="{v.url}">Открыть вакансию</a>',
    ]
    return "\n".join(lines)


async def check_new_vacancies(bot: Bot) -> None:
    """Check for new vacancies and send notifications."""
    if not CHAT_ID:
        logger.warning("CHAT_ID не задан, пропускаю проверку. Отправь /start боту.")
        return
    logger.info("Checking for new vacancies...")
    seen = load_seen()

    try:
        vacancies = fetch_vacancies()
    except Exception as e:
        logger.error(f"Failed to fetch vacancies: {e}")
        return

    new_count = 0
    for v in vacancies:
        if v.slug not in seen:
            seen.add(v.slug)
            new_count += 1
            msg = format_vacancy(v)
            try:
                await bot.send_message(
                    chat_id=CHAT_ID,
                    text=msg,
                    parse_mode="HTML",
                    disable_web_page_preview=True,
                )
                logger.info(f"Sent notification: {v.title}")
            except Exception as e:
                logger.error(f"Failed to send message for {v.slug}: {e}")

    save_seen(seen)
    logger.info(f"Check complete. Found {new_count} new out of {len(vacancies)} total.")


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    global CHAT_ID
    chat_id = str(update.effective_chat.id)

    if not CHAT_ID:
        # First run: save chat_id to .env automatically
        CHAT_ID = chat_id
        if ENV_FILE.exists():
            content = ENV_FILE.read_text()
            content = content.replace("TELEGRAM_CHAT_ID=", f"TELEGRAM_CHAT_ID={chat_id}")
            ENV_FILE.write_text(content)
        logger.info(f"Chat ID saved: {chat_id}")
        await update.message.reply_text(
            f"Chat ID сохранён: {chat_id}\n\n"
            f"Бот настроен и готов к работе! "
            f"Уведомления о новых вакансиях будут приходить сюда.\n\n"
            f"Команды:\n"
            f"/check — проверить новые вакансии\n"
            f"/status — текущий статус\n"
            f"/reset — сбросить историю",
        )
        # Trigger first check now
        await check_new_vacancies(context.bot)
    else:
        await update.message.reply_text(
            f"Привет! Я бот для отслеживания вакансий Яндекса.\n\n"
            f"Твой chat_id: {chat_id}\n\n"
            f"Команды:\n"
            f"/check — проверить новые вакансии\n"
            f"/status — текущий статус\n"
            f"/reset — сбросить историю",
        )


async def cmd_check(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    await update.message.reply_text("Проверяю вакансии...")
    await check_new_vacancies(context.bot)
    await update.message.reply_text("Готово!")


async def cmd_status(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    seen = load_seen()
    await update.message.reply_text(
        f"Отслеживаю вакансии каждые {CHECK_INTERVAL} мин.\n"
        f"Известных вакансий: {len(seen)}"
    )


async def cmd_reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    save_seen(set())
    await update.message.reply_text("История сброшена. Следующая проверка пришлёт все текущие вакансии.")


async def post_init(app: Application) -> None:
    """Run after the application is initialized."""
    await app.bot.set_my_commands([
        BotCommand("check", "🔍 Проверить новые вакансии"),
        BotCommand("status", "📊 Текущий статус"),
        BotCommand("reset", "🔄 Сбросить историю"),
    ])

    scheduler = AsyncIOScheduler()
    scheduler.add_job(
        check_new_vacancies,
        "interval",
        minutes=CHECK_INTERVAL,
        args=[app.bot],
        id="vacancy_check",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(f"Scheduler started: checking every {CHECK_INTERVAL} minutes")

    if CHAT_ID:
        await check_new_vacancies(app.bot)


def main() -> None:
    if not BOT_TOKEN:
        raise ValueError("TELEGRAM_BOT_TOKEN is not set in .env")
    if not CHAT_ID:
        logger.warning("TELEGRAM_CHAT_ID не задан. Отправь /start боту, чтобы сохранить chat_id.")

    app = Application.builder().token(BOT_TOKEN).post_init(post_init).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("check", cmd_check))
    app.add_handler(CommandHandler("status", cmd_status))
    app.add_handler(CommandHandler("reset", cmd_reset))

    logger.info("Bot started")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
