# Style Pack — Achievements Screen Redesign

Pack for Claude Design / pencil. Loads brand identity «Вертушка» + текущее состояние
экрана «Ачивки» + бриф на переработку.

## Структура

```
style-pack-achievements/
├── 01_brand/          # Палитра, лого, design bar — айдентика B1 «Stamper Hi-Fi»
├── 02_screens/        # Существующие экраны Вертушки — язык приложения
├── 03_references/     # Мудборд (винил-обложки, цветовой темперамент)
├── 04_code/           # theme.ts + AchievementPin + текущий экран — что есть в коде
├── 05_brief/          # TOKENS.md + BRIEF.md — что делать
└── 06_current_state/  # Скриншоты текущего экрана + 3 референса-пина из чата
```

## ВАЖНО — что приложить отдельно к промпту

В пак **не вошли** 3 референсных пина, которые юзер прислал в чате:
1. Золотой пин «100» (стопка пластинок)
2. Синий пин «500» (золотое колесо + виниловые диски)
3. Сундук «vinyl-box» (открытая коробка с пластинкой)

Эти референсы — **точный target-стиль** для каждого enamel-пина в новом дизайне.
Приложить к Claude Design отдельной картинкой в том же запросе.

## Как использовать

1. Загрузить весь zip в Claude Design / pencil
2. Приложить 3 референса-пина из чата
3. Прокинуть промпт из `05_brief/BRIEF.md` (полный)
4. Tokens-источник истины — `05_brief/TOKENS.md` и `04_code/theme.ts`

## Контекст

- App: Вертушка (vinyl collector, iOS/Expo)
- Brand: B1 «Stamper Hi-Fi» v2 (navy + cobalt + ember + ivory)
- Target screen: `Mobile/app/achievements.tsx`
- Метафора: бархатная витрина пинов-коллекционера
