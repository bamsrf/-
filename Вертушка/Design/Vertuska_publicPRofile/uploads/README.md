# Вертушка — Мобильное приложение

Кроссплатформенное мобильное приложение для управления коллекцией виниловых пластинок.

## Технологии

- **Expo SDK 52** с TypeScript
- **Expo Router** — file-based navigation
- **Zustand** — state management
- **Axios** — HTTP client
- **expo-camera** — сканер штрихкодов

## Структура проекта

```
Mobile/
├── app/                    # Экраны (Expo Router)
│   ├── (auth)/             # Авторизация
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/             # Основные табы
│   │   ├── search.tsx      # Поиск
│   │   ├── index.tsx       # Сканер (центральный)
│   │   └── collection.tsx  # Коллекция + Хочу
│   ├── profile.tsx         # Профиль (модальный)
│   └── record/[id].tsx     # Детали пластинки
├── components/             # Компоненты
│   ├── ui/                 # Базовые UI компоненты
│   ├── Header.tsx
│   ├── RecordCard.tsx
│   └── RecordGrid.tsx
├── lib/                    # Логика
│   ├── api.ts              # API клиент
│   ├── store.ts            # Zustand stores
│   └── types.ts            # TypeScript типы
└── constants/
    └── theme.ts            # Дизайн-система
```

## Запуск

### 1. Установка зависимостей

```bash
cd Mobile
npm install
```

### 2. Запуск в режиме разработки

```bash
# iOS симулятор
npm run ios

# Android эмулятор
npm run android

# Expo Go (на телефоне)
npm start
```

### 3. Настройка API

В файле `lib/api.ts` замените `API_BASE_URL` на адрес вашего backend:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:8000/api'  // Для разработки
  : 'https://your-production-url.com/api';
```

## Экраны

| Экран | Описание |
|-------|----------|
| **Поиск** | Поиск пластинок по Discogs API |
| **Скан** | Сканирование штрихкодов камерой |
| **Коллекция** | Ваши пластинки с переключателем Моё/Хочу |
| **Профиль** | Настройки и статистика |
| **Детали** | Информация о пластинке, треклист, цены |

## Сборка

### iOS (App Store)

```bash
npx eas build --platform ios
```

### Android (Google Play)

```bash
npx eas build --platform android
```

## Дизайн

Nike-inspired минималистичный дизайн:
- Светлый фон с большим количеством воздуха
- Крупная типографика
- Акцентный цвет: `#8B7355` (тёплый виниловый коричневый)
