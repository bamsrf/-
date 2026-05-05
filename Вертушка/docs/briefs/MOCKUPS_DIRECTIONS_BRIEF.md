# Brief для Claude Design: 4 направления стилистики (мокапы)

**Цель:** получить 16 экранов-мокапов (4 направления × 4 экрана), чтобы выбрать визуальный вектор айдентики до того, как переходить к маскоту, иконкам ачивок и финальному theme.ts.

**Маскот в этом раунде НЕ показывается** — он отдельная задача. Сейчас тестируем только палитру, типографику, фактуру, плотность и — главное — **как ведут себя реальные обложки пластинок** в каждом из четырёх миров.

---

## Что приложить дизайнеру

Папка для пакета:
```
mockups_directions_brief/
├── prompt.md                      ← текст PROMPT ниже целиком
├── theme.ts                       ← Mobile/constants/theme.ts (текущие токены)
├── RecordCard.tsx                 ← Mobile/components/RecordCard.tsx (главный компонент карточки)
├── RarityAura.tsx                 ← Mobile/components/RarityAura.tsx (рарити-логика, должна сохраниться)
├── current_palette.jpeg           ← Design/Color palette.jpeg (текущая ribbon-палитра)
├── references/                    ← 5 референсов от пользователя
│   ├── 01_mans_believe.jpeg       ← плакат с trading-card форматом (для образца ачивки)
│   ├── 02_melodic_techno.jpeg     ← grainy gradient + silhouette
│   ├── 03_cura_sentimento.jpeg    ← 70s warm jazz-mixtape baseline
│   ├── 04_liquid_speckle.jpeg     ← grain + ink texture
│   └── 05_macic.gif               ← 80s aerobics / vintage poster (GIF)
├── current_screens/               ← скриншоты (4 готовых, 1 пропускаем)
│   ├── collection_grid.png        ← из Design/screens&covers/Коллекция grid.PNG
│   ├── record_detail_1.png        ← из Design/screens&covers/Карточка пластинки_1.PNG
│   ├── record_detail_2.png        ← …_2.PNG (скролл вниз)
│   ├── record_detail_3.png        ← …_3.PNG
│   ├── record_detail_4.png        ← …_4.PNG (bottom actions)
│   └── onboarding_welcome.png     ← из Design/screens&covers/Onboarding.PNG
└── sample_covers/                 ← 4 реальные обложки коллекции (для контекста UI)
    ├── LW_cover.jpg
    ├── blueskies_cover.jpg
    ├── brasilianskies_cover.jpg
    └── insatiablehigh_cover.jpg
```

### Чек-лист скриншотов

Симулятор iOS 17+, iPhone 6.7" (1290×2796), светлая тема, реальные обложки коллекции (важно — не demo, чтобы видеть как направления уживаются с настоящим визуальным шумом обложек):

- [x] **Коллекция grid** — `Design/screens&covers/Коллекция grid.PNG`. Таб «В наличии», grid 2-col, ≥6 карточек.
- [x] **Карточка пластинки** — `Design/screens&covers/Карточка пластинки_1–4.PNG` (4 скролл-состояния одной записи: hero, meta+издание, трек-лист, bottom actions).
- [x] **Onboarding слайд 1** — `Design/screens&covers/Onboarding.PNG`. Animated gradient bg + huge title.
- [ ] **Trading card placeholder** — файла нет; экран дизайнер строит с нуля по описанию ниже (пропустить в сборке пакета).

### Команда для сборки пакета

```bash
cd "/Users/vladislavrumancev/Desktop/Cursor/Вертушка"
mkdir -p /tmp/mockups_brief/{references,current_screens,sample_covers}

# код и токены
cp Mobile/constants/theme.ts /tmp/mockups_brief/
cp Mobile/components/RecordCard.tsx /tmp/mockups_brief/
cp Mobile/components/RarityAura.tsx /tmp/mockups_brief/
cp "Design/Color palette.jpeg" /tmp/mockups_brief/current_palette.jpeg

# референсы (источники в Design/references/ имеют двойные расширения — переименовываем)
cp "Design/references/01_mans_believe.jpeg.jpeg"   /tmp/mockups_brief/references/01_mans_believe.jpeg
cp "Design/references/02_melodic_techno.jpeg.jpeg" /tmp/mockups_brief/references/02_melodic_techno.jpeg
cp "Design/references/03_cura_sentimento.jpeg.jpeg" /tmp/mockups_brief/references/03_cura_sentimento.jpeg
cp "Design/references/04_liquid_speckle.jpeg.jpeg" /tmp/mockups_brief/references/04_liquid_speckle.jpeg
cp "Design/references/05_macic.jpeg.gif"           /tmp/mockups_brief/references/05_macic.gif

# скриншоты текущего UI
cp "Design/screens&covers/Коллекция grid.PNG"        /tmp/mockups_brief/current_screens/collection_grid.png
cp "Design/screens&covers/Карточка пластинки_1.PNG"  /tmp/mockups_brief/current_screens/record_detail_1.png
cp "Design/screens&covers/Карточка пластинки_2.PNG"  /tmp/mockups_brief/current_screens/record_detail_2.png
cp "Design/screens&covers/Карточка пластинки_3.PNG"  /tmp/mockups_brief/current_screens/record_detail_3.png
cp "Design/screens&covers/Карточка пластинки_4.PNG"  /tmp/mockups_brief/current_screens/record_detail_4.png
cp "Design/screens&covers/Onboarding.PNG"            /tmp/mockups_brief/current_screens/onboarding_welcome.png

# образцы реальных обложек коллекции (для контекста UI — разный «визуальный шум»)
cp "Design/screens&covers/LW_cover.jpg"              /tmp/mockups_brief/sample_covers/
cp "Design/screens&covers/blueskies_cover.jpg"       /tmp/mockups_brief/sample_covers/
cp "Design/screens&covers/brasilianskies_cover.jpg"  /tmp/mockups_brief/sample_covers/
cp "Design/screens&covers/insatiablehigh_cover.jpg"  /tmp/mockups_brief/sample_covers/

cp docs/briefs/MOCKUPS_DIRECTIONS_BRIEF.md /tmp/mockups_brief/prompt.md
open /tmp/mockups_brief
```

### Перед сборкой пакета

1. **Референсы — уже в `Design/references/`** ✅ (сохранены 2026-05-02). Внимание: 4 файла имеют двойное расширение `.jpeg.jpeg`, пятый (`05_macic`) — `.jpeg.gif`. Команда сборки выше переименовывает их корректно.
2. **Скриншоты — уже в `Design/screens&covers/`** ✅:
   - `Коллекция grid.PNG` — экран коллекции
   - `Карточка пластинки_1–4.PNG` — 4 состояния карточки (полный скролл)
   - `Onboarding.PNG` — первый слайд онбординга
   - `trading_card_placeholder` — **нет**, этот экран дизайнер строит с нуля.
3. **Sample covers** (`LW_cover.jpg`, `blueskies_cover.jpg`, `brasilianskies_cover.jpg`, `insatiablehigh_cover.jpg`) включены в пакет отдельной папкой — дизайнер может вставить их в мокапы коллекции вместо placeholder'ов.

---

## PROMPT (отдай дизайнеру целиком)

Спроектируй 16 экранов-мокапов для мобильного приложения «Вертушка» — RU-каталога винила, CD и кассет (React Native, Expo, светлая тема). Цель раунда — выбрать **визуальный вектор айдентики**, поэтому работаем по матрице 4 направления × 4 экрана.

### О приложении (контекст, чтобы понимать функцию)

«Вертушка» — это персональная полка коллекционера: добавление пластинок (поиск Discogs / штрихкод / распознавание обложки через GPT-Vision), коллекция и вишлист, рарити-теги (3 активных — Коллекционка / Лимитка / Популярно), цены USD+RUB, публичный профиль, бронирование подарков из чужого вишлиста. Tone-of-voice — «Хранитель полки»: тёплый, ироничный, не детский.

Главная визуальная задача интерфейса — **не конкурировать с обложками пластинок**. Обложки сами яркие и плотные; UI должен быть полем, а не плакатом-соперником. Поэтому ни одно из 4 направлений не должно «перекрикивать» обложку.

### Что просим: 4 направления × 4 экрана = 16 мокапов

| | Без grain (чистый digital) | С grain (печатно-плакатный) |
|---|---|---|
| **80s aerobics only** | **1A. 80s clean** | **1B. 80s grainy** |
| **70s + 80s mix** | **2A. Mix clean** | **2B. Mix grainy** |

Желательно — выложить как 4×4 матрицу одной композицией, чтобы сразу было видно сравнение.

### Описание направлений

#### 1A. 80s aerobics only, без grain (modern fitness)

**Референс:** `references/05_macic.jpeg`, но без зерна; чистая 80s неон-aerobic эстетика.

- **Палитра:** hot pink `#FF3B7B`, cyan `#00D4E1`, electric magenta `#C843E9`, warm yellow `#FFC93C`, cream `#FFF6E1` как поле, charcoal `#1A1A1F` для текста (вместо чистого чёрного — теплее).
- **Типография:** display — Rubik Regular Bold или Rubik Mono One (в проекте уже подключён, хорошая кириллица). Body — Inter (уже подключён). Можно протестировать **Rubik Vinyl** для accent-заголовков (буквы стилизованы под винильную канавку), но проверить наличие кириллицы.
- **Фактура:** чистые soft градиенты, soft glow, без noise. Допустимы тонкие штрихованные паттерны как декоративные элементы.
- **Иерархия:** жирные типографические блоки, generous whitespace, очень читаемо.
- **Accent-стратегия:** яркие cyan и magenta для CTA / hot states / рарити-burst. Hot pink для primary action.
- **Настроение:** «энергично, бодро, читабельно».

#### 1B. 80s aerobics only, с grain

**Референс:** `references/05_macic.jpeg` + `references/02_melodic_techno.jpeg` (grain).

- **Палитра, типография, иерархия, accent-стратегия:** идентичны 1A.
- **Фактура:** **risograph-style зерно поверх всех градиентов и фоновых заливок**. Рекомендуется реализация через статический PNG-overlay (накладывается раз, не пересчитывается в скролле). Можно добавить halftone dots в shadow-областях. Scanline-suggestion опциональна.
- **Что должно остаться digital:** обложки пластинок, иконки, текст — без зерна.
- **Настроение:** «энергично, но как плакат, не как app».

#### 2A. 70s + 80s mix, без grain

**Референс baseline:** `references/03_cura_sentimento.jpeg`. **Референс burst:** `references/05_macic.jpeg`.

- **Палитра baseline (70s warm jazz-mixtape):** muted coral `#E47B5C`, warm cream `#F5EAD3` (поле), soft peach `#F8C5A8`, dusty teal `#5B8A92` (cold accent), charcoal `#2A1F1A` для текста.
- **Палитра 80s burst:** используется **только** для hot rarity / celebrations / primary CTA. Цвета 1A в приглушённой версии: hot pink `#E5527E`, electric blue `#3D8DD5`, warm yellow `#E5B23F` (без чистого cyan, без чистого magenta).
- **Типография:** display — **TT Travels Next** (warm vintage rounded, есть кириллица; платный) или **Rubik Mono One** как fallback. Body — Inter. Допустимо использовать lighter weight для 70s ощущения.
- **Фактура:** чистые soft gradients, нет noise. Композиция — vintage album-cover layouts: generous breathing room, центральная композиция, минимальные блоки текста.
- **Accent-стратегия:** muted teal для secondary, hot pink burst точечно — на ачивках, CTA, рарити «Hot».
- **Настроение:** «созерцательно, ламповый jazz-bar; пробуждается в момент celebration».

#### 2B. 70s + 80s mix, с grain

**Референс:** `references/03_cura_sentimento.jpeg` + `references/04_liquid_speckle.jpeg` (для текстуры).

- **Палитра, типография, иерархия, accent-стратегия:** идентичны 2A.
- **Фактура:** **warm-tinted grain** (тёплый peach/orange tint, не нейтральный серый), paper texture поверх фона, risograph dots в peach-областях. То же правило: PNG-overlay, не real-time noise.
- **Что должно остаться digital:** обложки и текст.
- **Настроение:** «винтажная mixtape-обложка, отпечатанная в типографии 1976 года».

### Описание экранов

#### Экран 1 — Коллекция grid

Из скриншота `current_screens/collection_grid.png`. Должно остаться:

- Header: иконка профиля слева, по центру или слева — заголовок (можно пересмотреть стиль).
- Segmented control: «В наличии» / «Вишлист».
- Action-row: grid/list toggle, формат-фильтр, папки, кнопка «Выбрать».
- Grid 2-col, ≥6 карточек видно. Аспект карточки — обложка 1:1 + 2 строки текста снизу (название, артист).
- На 1–2 карточках — рарити-аура (`collectible` — золотой shimmer ring; `hot` — оранжевый left-edge + heat-haze). **Эти эффекты должны переноситься в любое из 4 направлений** (палитра аур — отдельная константа, не зависит от палитры темы).
- Footer: card «Стоимость коллекции» с иконкой и chevron.
- BlurView tab bar внизу: 3 таба (Search / Index / Collection).

**Что мы тестируем:** выживут ли обложки на новом фоне? Не сливается ли текст с полем? Не теряются ли рарити-эффекты?

#### Экран 2 — Карточка пластинки

Из `current_screens/record_detail.png`. Должно остаться:

- Header: back button.
- Hero-cover full-width 1:1.
- Title (display-typo, 32–40px) + Artist card (clickable).
- Meta-row: год · формат · страна · vinyl-color tag (pill с цветом).
- Section «Издание» (Card): Лейбл / Каталожный №.
- Section «Жанр» + Style.
- Section «Особенности» (если активны рарити): 1–2 TierFeatureBlock'а — цветной dot + название тира + одна строка описания.
- Section «Примерная стоимость»: «от X · ~Y · до Z» (RUB) + caption «Discogs: $XX · курс YY ₽ · × Z.ZZ».
- Section «Треклист»: 5–7 строк (позиция / название / длительность).
- Bottom BlurView: «Добавить» + «В вишлист».

**Что мы тестируем:** информационная плотность; типографическая иерархия (10 секций друг за другом — где начинается монотонность); читаемость цены и tracklist.

#### Экран 3 — Onboarding welcome (slide 1 «Знакомство»)

Из `current_screens/onboarding_welcome.png`. Должно остаться:

- Animated gradient bg на весь экран (можно перерисовать в стиле направления).
- Hero-зона: сейчас стоит Ionicon `disc-outline` (56px white) — в этом раунде **заменить на абстрактную композицию** под направление (для 1A/1B — неоновый круг с рингом; для 2A/2B — warm sun-burst или ribbon). Маскота нет.
- Eyebrow: «ЗНАКОМСТВО» (caption, uppercase, 11px).
- Title: «Вертушка» (display-typo, 36–46px).
- Body: «Твоя коллекция винила, CD и кассет — в одном месте» (16px, line-height 23).
- Dot paginator (4 dots, активный — расширенный).
- CTA: «Далее» (full-width button или pill).
- Skip top-right: «Пропустить».

**Что мы тестируем:** как display-типографика «играет» в полный экран; как фон в каждом направлении ощущается как hero; читаемость с цветным фоном.

#### Экран 4 — Trading card образец для ачивки

Этот экран **строится с нуля**, скриншота нет. Идея — карточка-постер по образцу `references/01_mans_believe.jpeg`:

- Frame: рамка с slightly rounded corners, внутренняя padding — щедрая.
- Центральная композиция: абстрактная (placeholder под будущего маскота). Для 1A/1B — неоновый burst или диагональная композиция. Для 2A/2B — warm sun-burst или ribbon с halftone.
- Заголовок-pair (как «Tell me why» + «I gotta believe» на референсе): bold display + serif-like accent или контраст в размере. Использовать для названия ачивки + flavor text.
- Mini metadata-bar внизу: ID ачивки (например, `B_007`) / категория (например, «РАЗМЕР КОЛЛЕКЦИИ») / дата получения / маленькая иконка.
- Sparkle accents (тонкие звёздочки, как на MANS) — точечно.
- Размер для отображения внутри приложения: ~340×440 (3:4 portrait), но может масштабироваться до full-width при шеринге.

**Заглушка контента:** название ачивки — «Сотня в шкафу», flavor text — «Сто пластинок собрано — теперь это не хобби, а коллекция», категория — «РАЗМЕР КОЛЛЕКЦИИ», ID — `B_007`.

**Что мы тестируем:** работает ли trading-card как базовая ячейка приложения; читается ли формат как «это можно собирать».

### Технические ограничения (как в RARITY_DESIGN_BRIEF)

- React Native + Reanimated 3 (UI-thread анимации).
- Glow / shadow — нативный shadow + анимированный opacity. **Не Skia**, **не backdrop-filter**, **не CSS-фильтры**.
- Градиенты — `expo-linear-gradient` или radial через mask.
- BlurView — для tab bar и bottom-actions; intensity 60–80 light.
- Иконки — Ionicons (по умолчанию). Если что-то custom — отдельные SVG.
- Шрифты — Inter (есть, кириллица), Rubik Mono One (есть, кириллица), Rubik Regular family (можно подключить, кириллица), TT Travels Next (нужно купить, кириллица), либо альтернативы из RU-доступных (Bebas Neue Cyrillic, ALS Hauss, Geometria, CoFo Sans).
- В коллекции одновременно скроллятся 30–50 карточек — фактуры (grain) реализуются через статический overlay-PNG, не через runtime noise.
- Светлая тема (dark mode пока вне scope).
- Локализация — только русский (английский вне scope).

### Что показать в результате

1. **Матрица 4×4** — 4 направления (столбцы) × 4 экрана (строки), все мокапы видны рядом.
2. Для каждого направления — **выкладка названия «Вертушка»** в hero-стиле, чтобы сразу оценить типографику.
3. Для каждого направления — **палитра** (5–7 swatches с hex'ами).
4. Для каждого направления — **примечание о фактуре**: какой PNG-grain используется, или почему его нет.
5. **Trading card как отдельный кадр** в каждом из 4 направлений (повтор экрана 4, но в большем разрешении — для оценки печатного потенциала).
6. Опционально: 1–2 кадра анимации на любом из экранов (если возникнет идея — например, как должна себя вести рарити-аура в новом окружении).

Не нужно прорабатывать: маскота (это следующий раунд), иконки ачивок (после маскота), App Icon / Splash, копирайт, иллюстрации для empty/error states. Всё это идёт после выбора направления.

### Формат поставки

- Figma frame со всеми мокапами (предпочтительно).
- Или PNG-экспорт каждого мокапа в полном разрешении (1290×2796 для экранов; trading card отдельно).
- + краткая записка от дизайнера: какое направление кажется самым работоспособным с точки зрения **обложки vs UI** (это не обязательное мнение, но полезное).

---

## После получения мокапов

1. Сравниваем 4 направления глазом — на реальных обложках.
2. Выбираем одно (или гибрид «фактура из X, палитра из Y»).
3. На выбранном направлении пишем следующий бриф — **MASCOT_BRIEF.md** (концепция маскота-вертушки: пластинка делает roundhouse-kick на 360° с блеском в зените).
4. Параллельно — финализируем `theme.ts` под выбранное направление.
