# Pin Design — официальный набор пинов Вертушки

Источник: `Пины Вертушки.zip` (получен от дизайн-системы 2026-05-27).
Передавать на доработку Claude Design / новых дизайнеров **как есть** —
это canonical-стиль эмалевого пина для всех ачивок.

## Структура

```
07_pin_design/
├── pins/                       # SVG официальных пинов (готовые ачивки)
│   ├── A1_first_record.svg
│   ├── A2_first_wishlist.svg
│   ├── A3_avatar_set.svg
│   ├── A4_public_profile.svg
│   ├── B1_starter.svg
│   ├── B2_collector.svg
│   ├── J1_first_gift.svg
│   ├── META_foundation.svg
│   ├── R_self_titled.svg
│   ├── R_thirty_three.svg
│   ├── PLACEHOLDER_egg.png     # raw с baked-checker BG (ОРИГИНАЛ)
│   ├── PLACEHOLDER_gift.png    # raw с baked-checker BG (ОРИГИНАЛ)
│   └── PLACEHOLDER_trophy.png  # raw с baked-checker BG (ОРИГИНАЛ)
├── placeholders_stripped/      # ЭТИ использовать в приложении
│   ├── PLACEHOLDER_egg.png     # alpha-cleaned, ready-to-use
│   ├── PLACEHOLDER_gift.png    # alpha-cleaned, ready-to-use
│   └── PLACEHOLDER_trophy.png  # alpha-cleaned, ready-to-use
├── screens/                    # JSX-референсы дизайн-канваса
├── uploads/                    # Исходники, мудборды, планы
├── Achievements.html           # demo-страница
├── Contact Sheet.html          # demo-страница
├── app.jsx                     # canvas app
└── design-canvas.jsx           # canvas
```

## Placeholders — статус

Оригиналы (`pins/PLACEHOLDER_*.png`) пришли с **запечённым checkerboard-фоном**
(transparency-pattern шахматки нарисованы в RGB, alpha=255 везде). В UI смотрелись
бы как серо-белая шахматка вокруг пина.

В `placeholders_stripped/` лежат версии после автоматической очистки:
- cv2 floodFill из 8 краевых seeds по маске «grayscale-like, bright pixels».
- Соединённая с краем компонента → alpha=0, RGB=0.
- Внутренние ivory-блики пина сохранены (флуд не пересекает gold-rim).
- Прозрачность: egg 62.6%, gift 48.1%, trophy 49.7%.

Скрипт очистки: см. `style-pack-achievements/scripts/strip_checker.py`
(если положить туда — пока в `/tmp/strip_checker.py`).

## Куда подключено в коде

Параллельно положены в `Mobile/assets/achievements/`:
- `placeholders/egg.png`
- `placeholders/gift.png`
- `placeholders/trophy.png`
- `pins/*.svg`

Подключение в `AchievementPin.tsx` — отдельной задачей, после ревью.
