# UX-расширение для предложений магазинов

> Документ описывает как данные парсера показываются юзеру в приложении.
> Базовая инфра (парсер, БД, API, клик-трекинг) описана в [SHOPS_PARSING.md](SHOPS_PARSING.md).
> Здесь — **только** про UX и фичи, что видит юзер.

---

## 0. Что уже есть (Phase A)

**Только блок «Где купить» на карточке записи** (`/record/[discogs_id]`).
Юзер должен **сам открыть карточку**, чтобы увидеть offer-ы. Это первый шаг, но данные пока «спрятаны».

Дальше расширяемся в 5 направлений (приоритет ↓):

| # | Фича | Приоритет | Сложность | Зависит от |
|---|---|---|---|---|
| 1 | Уведомления о вишлисте (этот релиз **+ другие версии master**) | 🔥 Killer | 3-4 дня | 5+ магазинов |
| 2 | Бейдж «В продаже» в поиске и коллекции | 🔥 Высокий | 1-2 дня | ничего |
| 3 | Чип-фильтр «🟢 В продаже» в поиске | Средний | 1 день | бейджи (для согласованности UX) |
| 4 | Витрина «Маркет» на главной + полный экран | Средний | 5-7 дней | 5+ магазинов, 5к+ листингов |
| 5 | Вишлист → swipe-сравнение цен (drawer с офферами) | Высокий | 3-4 дня | 5+ магазинов |

---

## Фича 1 — Уведомления вишлиста 🔔

> Юзер давно хочет «Khruangbin – Mordechai» (положил в вишлист год назад). Парсер впервые находит её в магазине → юзеру летит push. Тапнул → попал на карточку → купил.

### 1.1 Что юзер видит

**Push на телефоне:**

```
┌─────────────────────────────────────────────┐
│ 🎉 Вертушка                           сейчас│
│ ─────────────────────────────────────────── │
│ Khruangbin — Mordechai из вашего вишлиста   │
│ появилась в Коробке Винила за 4 990 ₽       │
└─────────────────────────────────────────────┘
```

**Экран уведомлений** (`Mobile/app/notifications.tsx`, таб «Личные»):

```
🟢  Появилась в продаже
    Khruangbin — Mordechai
    Коробка Винила — 4 990 ₽
    2 минуты назад                         →
```

**Тап** → открывается карточка записи `/record/16241424` с автоскроллом к блоку «Где купить» (подсвечен 1 сек).

### 1.2 Расширение — «другая версия мастера»

Эта же логика, но триггер другой: юзер положил в вишлист **конкретный пресс** (например 2020 first press), а в магазине появился **другой пресс того же мастер-релиза** (например 2023 repress на цветном виниле).

В нашей БД `Record.discogs_master_id` объединяет все версии одного релиза. Логика:
1. У записи в вишлисте `master_id = 12345`
2. В store_listings появилась новая запись с `record.discogs_master_id = 12345` но другим `discogs_id`
3. → шлём уведомление другого типа

**Push:**
```
┌─────────────────────────────────────────────┐
│ 🎶 Вертушка                           сейчас│
│ ─────────────────────────────────────────── │
│ Другая версия Khruangbin — Mordechai (2023, │
│ Pink Vinyl) появилась в Vinylpark за 5 490 ₽│
└─────────────────────────────────────────────┘
```

В экране уведомлений — отдельная иконка/цвет (фиолетовая? чтобы отличать от точного матча).

### 1.3 Что от Backend

**Новые типы Notification** (модель уже есть, нужно только добавить enum-значения):
- `wishlist_in_stock` — точный матч (уже добавлен юзером сегодня) ✅
- `wishlist_alt_version_in_stock` — другая версия мастера (новый)

**Cron-задача** — `notify_wishlist_offers()` в `app/tasks/wishlist_alerts.py`:
- Запускается каждый день в 04:30 (после `daily_full_crawl_http` в 02:00 + `hourly_match_unmatched` за ночь)
- Алгоритм:
  ```sql
  -- 1. Для каждого активного юзера с включённым notify_wishlist_in_stock:
  -- 2. Точный матч (тип wishlist_in_stock):
  WITH new_offers AS (
    SELECT sl.matched_record_id, MIN(sl.price_rub) AS price, MIN(sl.store_id) AS store
    FROM store_listings sl
    WHERE sl.status = 'in_stock'
      AND sl.first_seen_at >= now() - interval '24 hours'  -- новые с прошлой проверки
      AND sl.matched_record_id IS NOT NULL
    GROUP BY sl.matched_record_id
  )
  SELECT wi.user_id, wi.record_id, no.price, no.store
  FROM wishlist_items wi
  JOIN new_offers no ON no.matched_record_id = wi.record_id
  WHERE NOT EXISTS (  -- защита от дубликатов
    SELECT 1 FROM notifications n
    WHERE n.user_id = wi.user_id
      AND n.type = 'wishlist_in_stock'
      AND n.payload->>'record_id' = wi.record_id::text
      AND n.created_at >= now() - interval '7 days'
  );

  -- 3. Другая версия мастера (тип wishlist_alt_version_in_stock):
  -- Тот же запрос, но JOIN'им через discogs_master_id вместо record_id
  ```
- Создаём Notification + отправляем push через expo-notifications
- В payload пишем: `record_id`, `store_id`, `store_slug`, `price_rub`, `listing_id`

**Идемпотентность:** «not in last 7 days» защищает от спама (если pesticide listing исчезнет на день и появится снова — не повторяем).

**Throttling:** если у юзера 50 пластинок в вишлисте и в один день 30 из них появились — НЕ слать 30 push'ей. Группируем в дайджест:
```
🎉 Вертушка
30 пластинок из вашего вишлиста появились
в магазинах. Откройте, чтобы посмотреть.
```
В экране уведомлений раскрывается список.

### 1.4 Что от Mobile

- `Mobile/components/NotificationItem.tsx` — добавить иконки/текст для `wishlist_in_stock` и `wishlist_alt_version_in_stock`
- Deep-link обработка: тап на push с `record_id=X` → `router.push('/record/X?scroll_to=offers')`
- В `Mobile/app/record/[id].tsx` поддержать query-параметр `scroll_to=offers` → автоскролл к `<OffersBlock />` + 1-сек подсветка (background-цвет → fade)
- Настройки уведомлений (`Mobile/app/settings/notifications.tsx`) — toggle уже есть (`notify_wishlist_in_stock`)

### 1.5 Acceptance Criteria

1. Юзер кладёт пластинку в вишлист → ничего не происходит сразу.
2. Парсер находит её в магазине через сутки → юзер получает push утром.
3. Тап на push → открывается карточка с подсвеченным блоком «Где купить».
4. Если в один день появилось >5 пластинок — один push «N пластинок появилось», без спама.
5. Если включено `notify_wishlist_in_stock=false` — пушей нет, но в feed уведомлений запись есть (юзер может зайти и посмотреть).

---

## Фича 2 — Бейдж «В продаже» в карточках 🟢

> Сейчас юзер ищет «Khruangbin» — видит сетку из 20 версий. Хочет купить, но не знает где она в продаже не открывая каждую. **Бейдж решает.**

### 2.1 Что юзер видит

**Карточка в поиске / коллекции / вишлисте** (RecordCard variant `expanded`):

```
┌─────────────────┐
│   [обложка]     │
│                 │
│         ┌─────┐ │ ← бейдж в правом нижнем углу обложки
│         │4990₽│ │
│         └─────┘ │
├─────────────────┤
│ Khruangbin      │
│ Mordechai       │
└─────────────────┘
```

Цвет бейджа: зелёный фон `#30A46C` (Colors.success), белый текст. Закругление как у `TierLabel`.

**Если есть и точный матч и другие версии мастера:**

```
         ┌──────┐
         │4990₽•│ ← точка означает «есть варианты»
         └──────┘
```
Тап на сам бейдж (с hit-area вокруг) → раскрывает мини-поповер с топ-3 предложениями. Или просто кликает по карточке → переходит на запись.

### 2.2 Что от Backend

**API endpoint `/api/records/search`** (существующий) — добавить в каждый `RecordSearchResult` поле:
```typescript
min_offer_price_rub?: number;   // минимальная цена среди свежих offers (< 7 дней)
offer_stores_count?: number;    // сколько магазинов сейчас продают
has_alt_version_offers?: boolean; // есть ли offers на другие версии мастера
```

**Реализация:** в `app/api/records.py:search_records()` после получения результатов:
```python
discogs_ids = [r.discogs_id for r in results]
# Один SQL-запрос на все ID разом
offers_summary = await db.execute(text("""
  SELECT
    r.discogs_id,
    MIN(sl.price_rub) FILTER (WHERE sl.matched_record_id = r.id) AS min_price_self,
    COUNT(DISTINCT sl.store_id) FILTER (WHERE sl.matched_record_id = r.id) AS stores_self,
    EXISTS(
      SELECT 1 FROM records r2
      JOIN store_listings sl2 ON sl2.matched_record_id = r2.id
      WHERE r2.discogs_master_id = r.discogs_master_id
        AND r2.id != r.id
        AND sl2.status = 'in_stock' AND sl2.last_seen_at >= now() - interval '7 days'
    ) AS has_alt
  FROM records r
  LEFT JOIN store_listings sl ON sl.matched_record_id = r.id
    AND sl.status = 'in_stock' AND sl.last_seen_at >= now() - interval '7 days'
  WHERE r.discogs_id = ANY(:ids)
  GROUP BY r.id
"""), {"ids": discogs_ids})
```
Кэшируется в Redis на 5 минут (короче чем основной 30-мин кэш).

То же самое для:
- `GET /collections/{id}/items` — листинг коллекции
- `GET /wishlist/items` — листинг вишлиста

### 2.3 Что от Mobile

- `Mobile/lib/types.ts` — добавить поля в `RecordSearchResult` и `VinylRecord`
- `Mobile/components/RecordCard.tsx` — новый под-компонент `<OfferPriceBadge price={...} hasAlt={...} />` поверх обложки
- Стилизация — как `TierLabel` из `RarityAura.tsx`, фон Colors.success
- Аналитика — `analytics.badgeShown` (Amplitude — чтобы видеть охват) и `analytics.badgeTap`

### 2.4 Acceptance Criteria

1. В поиске карточки с offer показывают бейдж с минимальной ценой.
2. Карточки без offers — без бейджа (не пустая надпись «Нет предложений»).
3. Бейдж не ломает grid-layout (RecordGrid 2-колоночный).
4. Performance: открыть поиск → результаты с бейджами за <300 мс (один SQL для всех).

---

## Фича 3 — Чип-фильтр «🟢 В продаже» в поиске 🔍

> Альтернативный сценарий дискавери: «не ищу конкретное, хочу посмотреть что доступно прямо сейчас».

### 3.1 Что юзер видит

В существующем экране поиска (`Mobile/app/(tabs)/search.tsx`) — рядом с уже-существующими чипами (Формат, Страна, Декада):

```
[Все][LP][7"]    [Россия][США][UK]    [🟢 В продаже]
```

При активном чипе:
- Запрос идёт с `?in_stock_only=true`
- Карточки в результатах — гарантированно с бейджем (Фича 2)
- В пустом запросе (без поисковой строки) показываем **топ магазинов** — недавние new arrivals (сортировка по `first_seen_at desc`)

### 3.2 Что от Backend

В `GET /records/search` добавить query-параметр:
```python
in_stock_only: bool = Query(False)
```

Если `true`:
```sql
SELECT r.* FROM records r
JOIN store_listings sl ON sl.matched_record_id = r.id
WHERE sl.status = 'in_stock'
  AND sl.last_seen_at >= now() - interval '7 days'
  AND (r.title ILIKE :q OR r.artist ILIKE :q)
ORDER BY sl.first_seen_at DESC  -- свежие сверху
LIMIT 50;
```

Discogs API в этом режиме НЕ дёргаем (бессмысленно — мы фильтруем по локальным offers).

### 3.3 Что от Mobile

- В `search.tsx` — добавить чип в существующий массив фильтров
- `lib/api.ts:searchRecords()` — добавить параметр `inStockOnly`
- При активном чипе скрывать sub-фильтры (Discogs-параметры неприменимы)

### 3.4 Acceptance Criteria

1. Без чипа — обычный поиск работает как раньше.
2. С чипом и пустой строкой — показываются последние 50 new arrivals.
3. С чипом и строкой — поиск только по локальным записям с offers (быстро, мгновенно).
4. Если ни одной пластинки в продаже — empty-state «Пока ничего нет в магазинах из этого запроса».

---

## Фича 4 — Витрина «Маркет» 🏪

> Полноценная вторая точка дискавери. На главной — «тизер» с крутящимися пластинками. Полный экран — это маркет всех магазинов.

### 4.1 «Что появилось в магазинах сегодня» — на главной

**Проблема:** текущая главная вкладка (`/app/(tabs)/index.tsx`) — это **сканер**, не классический хоум. Перед добавлением витрины нужно решить:
- Вариант A: **превратить главную в хоум**, сканер вынести в отдельную кнопку (FAB или иконка в шапке)
- Вариант B: **встроить витрину в сканер-экран** под секцию сканирования
- Вариант C: добавить **отдельный таб «Главная»** перед сканером

Рекомендую **вариант A** — это правильнее по UX, сканер не каждодневная фича.

**Компонент `<ShopArrivalsCarousel />`** на главной:

```
┌─────────────────────────────────────────┐
│  Свежее в магазинах             [→]     │ ← кнопка ведёт в /market
│  ─────────────────────────────────      │
│  ╔══════╗ ╔══════╗ ╔══════╗ ╔══════╗   │
│  ║[обл] ║ ║[обл] ║ ║[обл] ║ ║[обл] ║   │ ← горизонтальный
│  ║      ║ ║      ║ ║      ║ ║      ║   │   скролл
│  ║Khrun.║ ║Bonobo║ ║Tame I║ ║Lorde ║   │
│  ║4990₽ ║ ║3490₽ ║ ║5990₽ ║ ║4490₽ ║   │
│  ╚══════╝ ╚══════╝ ╚══════╝ ╚══════╝   │
└─────────────────────────────────────────┘
```

При тапе на карточку → `/record/[discogs_id]`.
При тапе на «Посмотреть всё» → `/market`.

### 4.2 Полный экран `/market`

Новый файл `Mobile/app/market.tsx`:

```
┌─────────────────────────────────────────┐
│  ← Маркет             [Магазин ▾][⚙]   │ ← фильтры в шапке
│                                         │
│ ─────────────────────────────────────── │
│ [Поиск по магазинам...]                 │ ← search input
│                                         │
│ [Цена ↑][Новые][Скидки][По рейтингу]   │ ← sort chips
│                                         │
│ ┌──────┐ ┌──────┐                       │
│ │[обл] │ │[обл] │                       │
│ │      │ │      │                       │
│ │Bonobo│ │Mac M.│                       │
│ │3490₽ │ │6490₽ │ ← grid 2-col           │
│ │Кор.В.│ │ВинПр.│                       │
│ └──────┘ └──────┘                       │
│ ┌──────┐ ┌──────┐                       │
│ │ ...  │ │ ...  │                       │
│ └──────┘ └──────┘                       │
└─────────────────────────────────────────┘
[Главн][Поиск][Маркет][Колл][...]
```

### 4.3 Что от Backend

**Новый endpoint `GET /api/market/listings`:**
```python
@router.get("/market/listings", response_model=MarketListingResponse)
async def get_market_listings(
    sort: Literal["new", "price_asc", "price_desc", "rating"] = "new",
    store_slug: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    format: str | None = None,
    year_from: int | None = None,
    year_to: int | None = None,
    q: str | None = None,
    cursor: str | None = None,
    limit: int = Query(40, le=100),
) -> MarketListingResponse:
    """
    Витрина «Маркет» — все актуальные офферы со всех магазинов с фильтрами.
    JOIN на records чтобы вернуть полную карточку.
    """
```

**Новый endpoint `GET /api/market/new-arrivals`:**
```python
@router.get("/market/new-arrivals", response_model=list[MarketListingItem])
async def get_new_arrivals(limit: int = Query(20, le=50)) -> list:
    """Последние N листингов появившихся за 7 дней — для главной."""
```

Cursor-pagination на основе `(first_seen_at, listing_id)`.
Redis-кэш 5 мин для new arrivals, без кэша для market (фильтры слишком вариативны).

### 4.4 Что от Mobile

- `Mobile/app/(tabs)/_layout.tsx` — добавить таб «Маркет» (`storefront` иконка)
- `Mobile/app/(tabs)/market.tsx` — новый экран
- `Mobile/components/ShopArrivalsCarousel.tsx` — компонент для главной
- `Mobile/components/MarketCard.tsx` — карточка с дополнительным полем «магазин»
- Pull-to-refresh, infinite scroll

### 4.5 Когда включать

Не раньше чем **5+ магазинов** и **5к+ активных листингов**. Иначе:
- Карусель на главной будет «одинокой» (одни Mac Miller)
- Маркет будет выглядеть пустым → bad first impression

---

## Фича 5 — Вишлист: swipe-сравнение цен 💰

> Юзер открыл вишлист (60 пластинок), видит на каждой «предварительная стоимость». Нет понимания где КОНКРЕТНО можно купить. Swipe-bar решает.

### 5.1 Что юзер видит

**В обычном состоянии** — карточка вишлиста как сейчас, **но** если есть offers — справа торчит вертикальный «язычок»:

```
┌─────────────────────────────────────────┐
│ ┌────┐ Khruangbin – Mordechai           │ ╱╱
│ │[об]│ ~5 990 ₽ предварительная        │╱╱╱← язычок-баннер
│ └────┘ Добавлена 12 марта 2026         │╲╲╲ «Сравнить цены»
└─────────────────────────────────────────┘ ╲╲
                                              ↑ можно тянуть пальцем
```

**После swipe влево** — карточка сдвигается, открывая offers-drawer:

```
        ┌──────────────────────────────────┐
[карт.] │ 🟢 4 990 ₽  Коробка Винила  Buy →│
сдв.    │ 🟢 5 200 ₽  Vinylpark       Buy →│
влево   │ 🟡 4 890 ₽  Plastinka.com   Buy →│ ← топ-3 offers по цене
        │    +2 ещё в магазинах            │
        └──────────────────────────────────┘
```

Тап на конкретный offer → переход на карточку записи с подсвеченным блоком (можно купить прямо там).

**Или** — тап на «+2 ещё» → bottom-sheet с полным списком, описанием каждого варианта (артикул, состояние, vinyl color, ссылка):

```
╔═════════════════════════════════════════╗
║  Все варианты — Khruangbin – Mordechai  ║
║  ─────────────────────────────────────  ║
║  ┌────────────────────────────────────┐ ║
║  │ [обл крупно] 🏪 Коробка Винила     │ ║
║  │              4 990 ₽               │ ║
║  │              LP · Red · 2020       │ ║
║  │              Артикул: 0656605149318│ ║
║  │  ┌────────────────────────────┐    │ ║
║  │  │     КУПИТЬ НА САЙТЕ →      │    │ ║
║  │  └────────────────────────────┘    │ ║
║  └────────────────────────────────────┘ ║
║  ┌────────────────────────────────────┐ ║
║  │ [обл] 🏪 Plastinka.com  4 890 ₽    │ ║
║  │       LP · Black · 2023            │ ║
║  │       Артикул: 0656605149319       │ ║
║  │  [КУПИТЬ НА САЙТЕ →]               │ ║
║  └────────────────────────────────────┘ ║
║  ┌────────────────────────────────────┐ ║
║  │ ... (другие версии мастера)         │ ║
║  └────────────────────────────────────┘ ║
╚═════════════════════════════════════════╝
```

Здесь же подсвечиваем «**Другая версия**» бэйджем, если `discogs_id` отличается от того что в вишлисте.

### 5.2 Технические детали (Mobile)

- **Библиотека:** `react-native-gesture-handler` уже стоит в Expo (стандарт). Использовать `Swipeable` от `react-native-gesture-handler/Swipeable`.
- **Компонент** `Mobile/components/WishlistRowWithOffers.tsx`:
  ```tsx
  <Swipeable
    renderRightActions={() => <OffersDrawer record={item.record} />}
    overshootRight={false}
    rightThreshold={40}
  >
    <WishlistRow item={item} />
  </Swipeable>
  ```
- **OffersDrawer** — компактный список топ-3 offers + кнопка «+N ещё»
- При тапе «+N ещё» → opens BottomSheet (`@gorhom/bottom-sheet` — стандарт для RN)
- BottomSheet содержит полный список с полями `OfferDetailCard` (артикул, цвет, состояние, ссылка)

### 5.3 Что от Backend

Уже всё есть! `GET /api/records/{discogs_id}/offers` отдаёт всё. Только надо:
- Для **«другая версия мастера»** — расширить endpoint:
  ```python
  GET /api/records/{discogs_id}/offers?include_master_versions=true
  ```
  → возвращает не только offers именно этой записи, но и offers других записей с тем же `discogs_master_id`. Помечает `is_alt_version: bool` в каждом offer.

### 5.4 Acceptance Criteria

1. В вишлисте карточка с offers — справа язычок «Сравнить цены».
2. Свайп влево раскрывает drawer с топ-3 offers по цене.
3. Тап на «+N ещё» → bottom-sheet с полным списком.
4. В bottom-sheet каждый offer показывает: лого магазина, цену, формат, цвет, артикул, кнопку «Купить на сайте».
5. При тапе «Купить» — клик-трекинг (Phase A) + открытие URL.
6. Если включён `include_master_versions` — alt-версии помечены бейджем.
7. Карточки без offers — без язычка (не дразним пустотой).

---

## Backend backlog (что нужно для всех фич)

### Новые поля в API

| Endpoint | Новое поле | Описание |
|---|---|---|
| `GET /records/search` | `min_offer_price_rub` | мин. цена offers | для Фичи 2 |
| `GET /records/search` | `offer_stores_count` | сколько магазинов | для Фичи 2 |
| `GET /records/search` | `has_alt_version_offers` | есть alt-версии | для Фичи 2 |
| `GET /records/search` | `?in_stock_only=true` | фильтр | для Фичи 3 |
| `GET /collections/{id}/items` | те же 3 поля | | для коллекции |
| `GET /wishlist/items` | те же 3 поля | | для вишлиста |
| `GET /records/{id}/offers` | `?include_master_versions=true` | + alt версии | для Фичи 5 |
| `GET /market/listings` | новый endpoint | витрина | для Фичи 4 |
| `GET /market/new-arrivals` | новый endpoint | свежее | для Фичи 4 |

### Новые типы Notification

| Type | Шаблон | Когда |
|---|---|---|
| `wishlist_in_stock` ✅ уже | «{title} из вишлиста появилась в {store}» | Фича 1 |
| `wishlist_alt_version_in_stock` | «Другая версия {title} появилась в {store}» | Фича 1 |
| `wishlist_price_drop` ✅ уже | «{title} подешевела в {store}» (Phase C) | — |

### Новый cron-job

`Backend/app/tasks/wishlist_alerts.py`:
- `notify_wishlist_offers()` — каждый день 04:30, после daily_full_crawl
- `notify_alt_version_offers()` — каждый день 04:35
- Throttling: дайджест если >5 новых для одного юзера

### Миграция

```sql
-- 1. Создаём materialized view для быстрых выборок «record → offers summary»
CREATE MATERIALIZED VIEW record_offers_summary AS
SELECT
  r.id AS record_id,
  r.discogs_id,
  r.discogs_master_id,
  MIN(sl.price_rub) AS min_price,
  COUNT(DISTINCT sl.store_id) AS stores_count,
  MAX(sl.last_seen_at) AS last_offer_at
FROM records r
LEFT JOIN store_listings sl ON sl.matched_record_id = r.id
  AND sl.status = 'in_stock' AND sl.last_seen_at >= now() - interval '7 days'
GROUP BY r.id;

CREATE UNIQUE INDEX idx_ros_record ON record_offers_summary (record_id);
CREATE INDEX idx_ros_discogs ON record_offers_summary (discogs_id);
CREATE INDEX idx_ros_master ON record_offers_summary (discogs_master_id);

-- Refresh раз в час (или после daily_incremental_crawl)
REFRESH MATERIALIZED VIEW CONCURRENTLY record_offers_summary;
```

Materialized view решит проблему производительности для бейджей в search/collection.

---

## Roadmap для UX (5 фич)

### Sprint 1 — Бейдж + Чип (~1 неделя)
- Фича 2 (бейдж в поиске/коллекции/вишлисте) — самое дешёвое и видимое
- Фича 3 (чип «В продаже» в поиске) — добивает дискавери
- **Зависит от:** ничего. Можно делать прямо сейчас, до подключения других магазинов

### Sprint 2 — Уведомления (~1 неделя)
- Фича 1 (уведомления вишлиста: точный матч + alt версия)
- Cron-задача + push-инфра
- **Зависит от:** 3+ магазина (чтобы было «о чём уведомлять»)

### Sprint 3 — Swipe сравнение цен (~1 неделя)
- Фича 5 (вишлист → swipe → drawer + bottom-sheet)
- BottomSheet компонент полный
- **Зависит от:** 3+ магазина

### Sprint 4 — Маркет (~2 недели)
- Фича 4 (главная превращается в home, карусель + полный экран)
- **Зависит от:** 5+ магазинов с 5к+ листингов
- Отложить если у нас ещё мало данных

### Условный Sprint 5 — Полировка
- A/B сортировки в Маркете (по цене / по магазину / по комиссии)
- Промокоды (Фича из affiliate Phase B-direct)
- Скидки-баннеры («-15% сегодня в Plastinka.com»)
- Соц-доказательство в карточке («Купили через нас 12 раз»)

---

## Что у нас уже есть готового (что переиспользуем)

| Готово | Откуда | Используется в |
|---|---|---|
| `Notification` модель + типы `wishlist_in_stock`/`wishlist_price_drop` | юзер сделал сегодня | Фича 1 |
| `notify_wishlist_in_stock` toggle у юзера | юзер сделал сегодня | Фича 1 |
| `expo-notifications` инфра + `NotificationItem.tsx` | существующее | Фича 1 |
| `RarityAura.TierLabel` — шаблон бейджа | существующее | Фича 2 |
| `RecordCard` с variant `expanded` | существующее | Фича 2 |
| Chip-фильтры в `search.tsx` (`FORMAT_OPTIONS`) | существующее | Фича 3 |
| `react-native-gesture-handler` (Swipeable) | стоит в Expo | Фича 5 |
| `Record.discogs_master_id` индекс + поле | существующее | Фичи 1, 5 |
| `OffersBlock` + `api.getRecordOffers` | Phase 0 | Фича 5 |
| `api.trackOfferClick` + click-таблица | Phase A affiliate | Все фичи |

---

## Что от тебя нужно для запуска

В порядке последовательности:

1. **Подтвердить UX-мокапы выше** — что бэйджи в правом нижнем, цвета зелёный, чип в существующих фильтрах, swipe именно справа налево и т.д.
2. **Решить про главную вкладку** (Фича 4) — A/B/C вариант (рекомендую A: home заменяет сканер)
3. **Выбрать порядок фич** — мой ребейзе Sprint 1 → 2 → 3 → 4, но может быть твои приоритеты другие
4. **Подключить 2-3 магазина** — иначе все эти UX-фичи будут выглядеть пусто

---

## Связанные документы

- [SHOPS_PARSING.md](SHOPS_PARSING.md) — основной план (Backend инфра, парсеры, affiliate)
- [AFFILIATE_OUTREACH_TEMPLATE.md](AFFILIATE_OUTREACH_TEMPLATE.md) — шаблон для direct-партнёрок
- [DEV_SETUP_LOCAL.md](dev/DEV_SETUP_LOCAL.md) — как поднять локально

---

## Файлы для имплементации

**Новые:**
- `Backend/app/api/market.py` — endpoints для маркета (Фича 4)
- `Backend/app/tasks/wishlist_alerts.py` — уведомления (Фича 1)
- `Backend/alembic/versions/YYYYMMDD_record_offers_summary_view.py` — materialized view
- `Mobile/app/(tabs)/market.tsx` — экран маркета (Фича 4)
- `Mobile/components/ShopArrivalsCarousel.tsx` — карусель на главной (Фича 4)
- `Mobile/components/OfferPriceBadge.tsx` — бейдж на карточках (Фича 2)
- `Mobile/components/WishlistRowWithOffers.tsx` — swipe wrap (Фича 5)
- `Mobile/components/OffersDrawer.tsx` — компактный drawer (Фича 5)
- `Mobile/components/OfferDetailBottomSheet.tsx` — полный список с описанием (Фича 5)

**Изменяемые:**
- `Backend/app/api/records.py` — добавить `?in_stock_only`, поля в результаты search
- `Backend/app/api/collections.py` — те же поля в коллекции
- `Backend/app/api/wishlists.py` — те же поля в вишлисте + endpoint alt-версий
- `Backend/app/api/offers.py` — `?include_master_versions=true`
- `Backend/app/main.py` — регистрация market-роутера и нового cron
- `Backend/app/models/notification.py` — добавить enum `wishlist_alt_version_in_stock`
- `Mobile/lib/types.ts` — расширить типы
- `Mobile/lib/api.ts` — новые методы
- `Mobile/components/RecordCard.tsx` — встроить OfferPriceBadge
- `Mobile/components/NotificationItem.tsx` — новые типы алертов
- `Mobile/app/(tabs)/search.tsx` — чип «В продаже»
- `Mobile/app/(tabs)/collection.tsx` — вишлист с swipe-сравнением
- `Mobile/app/(tabs)/_layout.tsx` — таб «Маркет»
- `Mobile/app/(tabs)/index.tsx` (если вариант A) — превращение в home
