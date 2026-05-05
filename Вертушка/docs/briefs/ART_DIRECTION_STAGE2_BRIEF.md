# Brief: Art-direction Key-Visuals (Stage 2)

**Цель раунда:** получить 4 hero key-visuals (по одному на направление 1A / 1B / 2A / 2B), которые **визуально различимы как 4 разных мира**, а не как палитровые свопы одного UI.

**Это Stage 2 двухстадийного процесса.** Stage 1 (HTML-baseline с 4 направлениями × 4 экранами) завершился: layout / palette tokens / typography / phone frame готовы и переиспользуются. Stage 1 провалился по одной оси — **композиционная грамматика** растворилась в soft-gradient blob'ах, потому что LLM-коденный HTML тянется в generic Apple-like UI. Этот раунд закрывает именно эту дырку — через image-gen, где компоновка переживает перевод.

**После Stage 2:** выбираем одно направление, переводим выбранное направление обратно в HTML-layout (Stage 1 переиспользуется как скелет, key-visual из Stage 2 ложится поверх как hero и фактурные элементы).

---

## Что прикладывается дизайнеру (минимум)

```
art_direction_stage2/
├── prompt.md                ← этот документ целиком
├── tokens.json              ← зафиксированные палитры + шрифты (см. ниже)
├── references/
│   ├── 01_mans_believe.jpeg     ← typographic poster, sparkle, frame
│   ├── 02_melodic_techno.jpeg   ← grain + atmospheric figure
│   ├── 03_cura_sentimento.jpeg  ← 70s warm jazz album baseline
│   ├── 04_liquid_speckle.jpeg   ← organic ink + grain
│   └── 05_macic.gif             ← 80s aerobics poster (figure + halftone)
└── stage1_failure_examples/      ← опционально
    └── decor80s_blob.png        ← скриншот того, ЧТО ИМЕННО не должно повториться
```

**Sample covers и UI-скриншоты НЕ нужны** — это арт-дирекшн без UI.

---

## Зафиксированные токены (Stage 1 → Stage 2, не менять)

### Палитра по направлениям

```json
{
  "1A_80s_clean": {
    "bg":        "#FFF6E1",
    "surface":   "#FFFFFF",
    "text":      "#1A1A1F",
    "primary":   "#FF3B7B",
    "accentA":   "#00D4E1",
    "accentB":   "#C843E9",
    "accentC":   "#FFC93C"
  },
  "1B_80s_grainy": "= 1A + risograph grain overlay",

  "2A_mix_clean": {
    "bg":        "#F5EAD3",
    "surface":   "#FBF4E2",
    "text":      "#2A1F1A",
    "primary":   "#E5527E",
    "accentA":   "#5B8A92",
    "accentB":   "#E47B5C",
    "accentC":   "#E5B23F"
  },
  "2B_mix_grainy": "= 2A + warm-tinted grain overlay"
}
```

### Шрифты (для wordmark-кадра, см. ниже)

| Направление | Display | Hero accent | Body | Italic accent |
|---|---|---|---|---|
| 1A | Rubik Mono One | — | Inter | — |
| 1B | Rubik Mono One | **Rubik Vinyl** | Inter | — |
| 2A | Unbounded | — | Inter | Fraunces italic |
| 2B | Unbounded | — | Inter | Fraunces italic |

Все шрифты доступны на Google Fonts и имеют кириллицу.

### Rarity (общая константа поверх всех направлений)

```json
{
  "collectible": "#B8860B (gold ring)",
  "limited":     "#6B4DCE (purple strip)",
  "hot":         "#FF5E3A (orange strip + heat-haze)"
}
```

В key-visuals **рарити не показываем** — это UI-уровень, не арт-дирекшн.

---

## Что мы делаем в этом раунде (deliverable)

### Обязательное (4 key-visuals)

4 PNG, каждый **1024×1024** (квадрат — самый универсальный для последующей пересадки в hero-композиции UI). Без UI-элементов: никаких status bar, кнопок, табов, тулбаров, segmented control'ов. **Чистый визуал — как обложка альбома без типографики**.

Структура: **2 пары × 2 кадра в паре**.

```
1A_80s_clean.png    ← композиция X, без grain, hard digital edges
1B_80s_grainy.png   ← композиция X (та же), с risograph grain + halftone

2A_mix_clean.png    ← композиция Y, без grain, чистая
2B_mix_grainy.png   ← композиция Y (та же), с warm paper grain
```

Внутри пары композиция **идентична** — меняется только фактура.

### Опциональное (4 wordmark-варианта)

4 PNG **1024×512** (горизонталь), на которых слово **«Вертушка»** в hero-типографике направления + 1–2 строки tagline. Фон — palette.bg направления + минимальные композиционные элементы (полоса, рамка, минимальный декор), но **без полноценной composition**. Это нужно, чтобы оценить как display-typography уживается с key-visual'ом.

```
1A_wordmark.png     ← «Вертушка» Rubik Mono One на cream + neon-strip
1B_wordmark.png     ← «Вертушка» Rubik Vinyl (буквы как канавка) + risograph grain
2A_wordmark.png     ← «Вертушка» Unbounded + «хранитель полки» Fraunces italic
2B_wordmark.png     ← то же + warm grain
```

---

## Композиционные prescriptions (НЕ vibe, а правила)

### Pair 1 — 80s aerobics (1A clean / 1B grainy)

**Источник композиционной грамматики:** `references/05_macic.gif` (figure + halftone) + `references/02_melodic_techno.jpeg` (grain on figure).

**Композиционная DNA, которую нужно перенести:**
- Один human-figure-силуэт в активной позе (motion energy)
- Halftone или диагональная полоса как структурный фон (не gradient)
- Hard edges между figure и background (никакого soft shadow)
- High-saturation neon-палитра (3-4 цвета максимум на кадр)
- Charcoal #1A1A1F как держатель композиции (не чистый чёрный)
- Slight off-register / поличроматический сдвиг (опционально, для 1B обязательно)

**Subject:** стилизованный силуэт человека, взаимодействующего с виниловой пластинкой (держит над головой / танцует с диском в руке / разворот в полу-прыжке). Силуэт — solid-color, не фотореалистичный. Диск — отдельный элемент с микро-textur'ой канавок.

**Composition rules (image-gen prompt-level constraints):**
- Figure занимает **35–45% площади кадра**, позиционируется **в левой трети или центре**
- Background: **диагональная halftone-зона** под углом 28° сверху-справа, плотность точек **40–60%**, цвет точек = `accentA` или `accentC`
- 1–2 broad diagonal-stripes других цветов (например, `primary` magenta) пересекают композицию
- Word-stamp: «ВЕРТУШКА» или «VINYL» или «1985» как minor type-element в углу или вдоль края (опционально, не обязательно — главное компоновка фигура+halftone)
- Освещение: **flat poster light**, без фотографических теней
- Viewing angle: front-facing или 3/4, никаких top-down

**Палитра (использовать буквально эти hex):**
- Background: `#FFF6E1` (cream) **или** `#1A1A1F` (charcoal) — выбирает дизайнер
- Halftone-точки и диагонали: `#FF3B7B`, `#00D4E1`, `#C843E9`, `#FFC93C`
- Силуэт: `#1A1A1F` или `#FFF6E1` (зависит от фона)

**Ready-to-use prompt (Midjourney v7 / Flux Pro / DALL-E 3 form):**

> *Bold 1980s aerobics-poster style illustration. Stylized human silhouette in mid-motion holding a black vinyl record above the head, occupying the left third of the frame. Background: diagonal halftone field at 28-degree angle in the upper right, dot density 50%, dots in cyan #00D4E1 and hot pink #FF3B7B. Two broad diagonal stripes in magenta #C843E9 and warm yellow #FFC93C cross the composition. Cream background #FFF6E1 underneath. Hard edges, flat poster lighting, no photographic shadows, no soft gradients. High contrast. Charcoal #1A1A1F silhouette. The vinyl record shows visible micro-grooves. Composition references the energy of late 80s neon aerobic ads and risograph music posters. Square 1:1.*

**1A vs 1B difference:**
- 1A: clean digital print — sharp pixels, no noise, vector-feel
- 1B: same composition but treated as **2-color risograph print** — visible paper texture, halftone dots more prominent, slight CMYK-style off-register on 1–2 elements (1–2px misalignment of magenta layer relative to cyan), grain ~20% intensity, warm paper-cream `#F5EAD3` underneath the cream

**Negative prompt (что НЕ должно появиться):**
> *Soft gradient blob, modern app UI, rounded card with shadow, BlurView, iPhone frame, segmented control, tab bar, button, ring/circle icon, abstract sun-burst, 3D render, glass morphism, photographic realism, soft shadow, smooth bokeh, vaporwave grid horizon, generic synthwave.*

---

### Pair 2 — 70s+80s mix (2A clean / 2B grainy)

**Источник композиционной грамматики:** `references/03_cura_sentimento.jpeg` (warm jazz album baseline) + `references/04_liquid_speckle.jpeg` (organic ink texture) + `references/01_mans_believe.jpeg` (typographic frame energy для wordmark-кадра).

**Композиционная DNA:**
- **Stillness** (в противовес motion из Pair 1) — статичная album-cover композиция
- Warm light, как window-light в 16:00 в комнате с деревянным полом
- Generous breathing room — центральный объект окружён воздухом
- Vintage album-cover layout: верх = small caption / artist name, центр = main subject, низ = catalog info
- Тёплая cream-палитра как baseline + изредка muted-pink burst как 80s-вкрапление
- Soft edges между объектами (paper-print ощущение), но **не gradient blur**

**Subject:** still-life в духе 70s record-store ad. Возможные варианты — выбирает дизайнер или генерирует все три и мы выбираем:

1. **Vinyl on wooden table** — пластинка лежит на тёплой деревянной поверхности, рядом — кассета или открытый конверт пластинки, золотистый свет из окна, лёгкий warm haze. Композиция: top-down или 3/4.
2. **Hand-held cover** — руки держат конверт пластинки, обложка частично видна (можно подразумеваемая обложка с warm gradient), pose почти иконографическая, как с религиозной иконой 70s.
3. **Listening figure** — silhouette/portrait человека сидящего на полу с пластинкой в коленях, soft profile, warm light from side, vinyl как центральный объект композиции (figure — обрамление).

**Composition rules:**
- Главный объект (vinyl или figure-with-vinyl) занимает **30–45% площади**, расположен **в центре или нижней трети**
- Над объектом — **breathing room**, минимум 15% высоты кадра
- Один **muted-pink burst** (`#E5527E`) появляется как точечный акцент: маленький значок, штамп, или слово (например, дата выпуска или «Side A»)
- Один **dusty teal accent** (`#5B8A92`) как изоляционный элемент: рамка, тонкая линия, или фрагмент типографики
- Освещение: **warm directional light**, имитация window-light 16:00, золотисто-оранжевый отлив на блике
- Viewing angle: предпочтительно flat-frontal или 3/4 top-down (album-cover convention)
- Опционально: vintage frame border 8–12% от края (warm cream stripe), как у LP-обложек 1976

**Палитра:**
- Background: `#F5EAD3` (warm cream) — обязательно
- Subject highlights: `#E47B5C` (coral), `#F8C5A8` (peach)
- Accent burst (точечно): `#E5527E` (muted hot pink)
- Cool isolator: `#5B8A92` (dusty teal)
- Text/silhouette: `#2A1F1A` (warm charcoal — НЕ чистый чёрный)

**Ready-to-use prompt:**

> *Vintage 1976 jazz-mixtape album cover composition. Centered still-life of a black vinyl record on a warm walnut wooden table, soft golden window light from the upper left at 16:00, casting a long warm shadow. A cassette tape lies next to it, slightly out of focus. Background: warm cream #F5EAD3 wall, gentle breathing room above the subject. Small muted pink #E5527E circular stamp in the upper right reading "VOL.07". Thin dusty teal #5B8A92 horizontal line frames the bottom of the composition. Charcoal #2A1F1A small typography "1976" in lower-right corner. Warm directional lighting, paper-print finish, flat composition (no harsh photographic shadows), generous negative space. References vintage jazz album covers from 1970s Japan and Brazil. Square 1:1.*

**2A vs 2B difference:**
- 2A: clean print finish — sharp paper, full saturation
- 2B: same composition treated as **printed on textured paper in 1976** — visible paper grain (warm-tinted, peach/orange tint, NOT neutral grey), risograph-style halftone in shadow areas at 30% density, slight ink bleed on edges, ~25% grain intensity overall, slight color desaturation (-10%)

**Negative prompt:**
> *Modern app UI, iPhone frame, BlurView, button, tab bar, abstract gradient blob, neon, synthwave, vaporwave, retro 80s grid horizon, sun-burst rays, ring icon, circle logo, cyan, magenta, electric blue, pure black #000, modern photographic realism, harsh studio light, glossy magazine cover, 3D render, glass morphism, modern minimalism.*

---

## Wordmark-варианты (опциональные 4 кадра)

Для каждого направления — отдельный 1024×512 PNG со словом «Вертушка» в hero-типографике, на minimal-фоне.

### 1A wordmark
- Шрифт: **Rubik Mono One**, размер ~140px, charcoal `#1A1A1F`
- Фон: cream `#FFF6E1`
- Декор: 1 диагональная hot-pink `#FF3B7B` полоса под углом 28°, проходящая позади текста на 30% высоты кадра
- Tagline под title: «КОЛЛЕКЦИЯ ВИНИЛА И КАССЕТ» — Inter Bold 16px, letter-spacing 4px, charcoal
- **Без grain**

### 1B wordmark
- Шрифт: **Rubik Vinyl** (буквы как канавка винила), размер ~160px, magenta `#C843E9` или charcoal на cream
- Фон: cream `#FFF6E1`
- Декор: тот же что в 1A + risograph grain overlay 30% intensity + slight off-register magenta layer (1px)
- Tagline: «КОЛЛЕКЦИЯ ВИНИЛА И КАССЕТ» Inter Bold 16px

### 2A wordmark
- Шрифт: **Unbounded SemiBold**, размер ~120px, warm charcoal `#2A1F1A`
- Фон: warm cream `#F5EAD3`
- Декор: thin dusty teal `#5B8A92` underline под title
- Tagline: «хранитель полки» — **Fraunces Italic** 36px, muted-pink `#E5527E`, расположен с правым выравниванием под title
- **Без grain**

### 2B wordmark
- = 2A + warm paper grain 25% intensity + slight peach-tinted vignette по краям

---

## Anti-patterns (буквально что НЕ должно появиться)

Перед отправкой в image-gen — проверь, что промпт исключает каждый из этих провалов Stage 1:

| Провал | Как избежать |
|---|---|
| **Soft gradient blob позади** | Negative prompt: "soft gradient, abstract gradient blob, blurred background"; positive: hard edges, flat poster lighting, sharp shapes |
| **Modern app UI чувствуется** | Negative: "iPhone, button, tab bar, segmented control, rounded card, BlurView, modern app, dashboard" |
| **Generic Apple/Material эстетика** | Positive: vintage poster print, 1976 album cover, risograph print, screen-printed |
| **Sun-burst / abstract icon в центре** | Negative: "abstract icon, ring, sun-burst, mandala, geometric logo" |
| **Pastel mush — палитра растворилась** | Positive: high contrast, hard color separation, two-color print; Negative: pastel, soft palette, low contrast |
| **Grain как film overlay (не как print)** | Positive: risograph print texture, halftone dots, paper grain; Negative: film grain, photo noise, vignette |
| **Synthwave grid horizon** (типичный image-gen default для "80s") | Negative: "vaporwave, synthwave, retro grid, neon horizon, palm tree, sunset" |
| **3D render** | Negative: "3D render, octane, blender, glossy plastic, depth of field" |

---

## Process — как генерировать

### Если используется Midjourney v7
```
[prompt above] --ar 1:1 --style raw --stylize 250 --weird 50 --no soft gradient, blob, app UI, sunset grid, 3d render
```

### Если Flux Pro / Nano Banana / GPT-Image
Натурально-языковой promp выше, в одном куске. Negative prompt отсутствует — используй позитивные exclusion-фразы внутри промпта («NOT a soft gradient, NOT a modern app UI»).

### Если Stable Diffusion (SDXL)
Используй **ControlNet с Canny или Depth** на reference 05_macic для Pair 1 и на 03_cura_sentimento для Pair 2 — это форс-фит композицию. Promp выше как positive, anti-patterns как negative.

### Сколько вариантов
- **3 варианта на каждое из 4 направлений** = 12 PNG минимум
- Если получится сильный кандидат с первого раза — достаточно 2 варианта на направление = 8 PNG

### Ожидаемое качество
- Не ждём «final art» — ждём **direction-defining key-visual**: достаточно убедительный, чтобы понять «вот этот мир сильный, вот этот слабый»
- Кропы / minor artefacts ОК
- Идеальный pixel-perfect — НЕ нужен в этом раунде

---

## Что считается успехом этого раунда

После просмотра 4 итоговых key-visuals можно ответить «да» на каждый из вопросов:

1. **Узнаваемость:** показав любой из 4 кадров рядом с соответствующим референсом, можно за 1–2 секунды увидеть связь?
2. **Различимость пар:** Pair 1 (80s aerobics) и Pair 2 (70s mix) **читаются как два разных мира**? Не «два палитровых свопа»?
3. **Различимость внутри пары:** clean и grainy в одной паре читаются как «один мир, два печатных пресса» — а не как два разных направления?
4. **Свобода от UI:** в кадре нет ни одного намёка на iPhone, кнопку, BlurView, сегментед-контрол?
5. **Свобода от blob'ов:** в кадре нет ни одного soft gradient, заполняющего >25% площади? Все «декоративные элементы» имеют hard edge или текстурную структуру?
6. **Domain-relevance:** в кадре есть пластинка / винил / звукозапись (в Pair 1 — в руках фигуры; в Pair 2 — как центральный subject)? Это не generic «80s aesthetic» / generic «vintage», а именно «приложение про винил»?

Если хотя бы на 1 вопрос «нет» — итерируем по тому направлению. **Не торопимся выбирать direction до того, как получили достойные 4 ключевых кадра.**

---

## Что в этом раунде НЕ делаем

- UI-мокапы (есть Stage 1 baseline)
- Маскот (отдельный раунд после выбора направления)
- Иконки ачивок (после маскота)
- App icon / splash screen
- Real album cover replacements (sample covers остаются те, что есть)
- Финализация выбора направления (выбираем после Stage 2, отдельно)
- Trading card композиция (после выбора направления + после маскота)

---

## После получения 4 key-visuals (Stage 3 preview)

1. Сравниваем 4 кадра, отвечаем на 6 вопросов выше.
2. Выбираем 1 направление (или гибрид «композиция Pair 2 + grain Pair 1», если возникнет).
3. Stage 1 HTML-baseline + выбранный key-visual → пересборка hero-зон 4 экранов:
   - Onboarding hero = key-visual fully
   - Collection header background = halftone-фрагмент из key-visual
   - Trading card center composition = композиционная DNA key-visual
   - Record detail — без изменений (остаётся neutral для конкуренции с обложками)
4. Финализация `theme.ts` под выбранное направление.
5. Следующий бриф: **MASCOT_BRIEF.md** (концепция маскота-вертушки, отдельный раунд image-gen).
