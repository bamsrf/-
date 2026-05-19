/**
 * Zustand-store для UX-состояний Маркета (раздел в (tabs)/search.tsx).
 *
 * Persisted через AsyncStorage:
 *   - searchScrollY — последняя Y-позиция скролла на экране поиска.
 *     Решает требование «потайная дверь остаётся открытой»: если юзер один
 *     раз опустил Маркет, при следующем заходе он сразу попадает туда
 *     (фон + sticky-header применяются на mount без flicker'а).
 *
 *   - hasSeenSwipeHint — флаг, что юзер уже видел pulse-подсказку на язычке
 *     вишлиста (Фича 5 swipe-сравнения). Pulse анимация играет один раз
 *     при первом открытии вишлиста с offers, потом не повторяется.
 *
 * isInMarket — derived selector (не персистится, вычисляется из scrollY).
 * Используется для тинта tab-иконки Search когда юзер «в Маркете».
 *
 * Источник: docs/plans/MARKET_AND_PRICE_DRAWER.md §1.4 + §2.1.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Порог в Y-px, выше которого считаем что юзер «в Маркете».
// Соответствует tail magic-transition (≈ 700 + первый разворот витрины ≈ 200).
export const MARKET_THRESHOLD_Y = 900;

// Порог сброса: если юзер вернулся выше — sticky обнуляется. Защита от
// «один раз случайно опустил — теперь всегда открыто». Чуть ниже верха
// Discogs-секций, чтобы случайные микро-скроллы не сбрасывали.
const RESET_THRESHOLD_Y = 100;

interface MarketState {
  /** Последняя Y-позиция на (tabs)/search.tsx (persisted). */
  searchScrollY: number;
  setSearchScrollY: (y: number) => void;

  /** Юзер уже видел pulse-анимацию язычка swipe-сравнения. */
  hasSeenSwipeHint: boolean;
  markSwipeHintSeen: () => void;

  /** Derived: считаем что юзер прямо сейчас в маркет-разделе. */
  isInMarket: () => boolean;
}

export const useMarketStore = create<MarketState>()(
  persist(
    (set, get) => ({
      searchScrollY: 0,
      hasSeenSwipeHint: false,

      setSearchScrollY: (y: number) => {
        // Защита: если юзер ушёл выше RESET_THRESHOLD — обнуляем sticky.
        // Иначе сохраняем последнюю позицию.
        if (y <= RESET_THRESHOLD_Y) {
          if (get().searchScrollY !== 0) set({ searchScrollY: 0 });
        } else {
          // Не пишем на каждый микро-скролл — throttle на стороне вызывающего
          // (debounced в MarketBackground через useDerivedValue + runOnJS).
          set({ searchScrollY: y });
        }
      },

      markSwipeHintSeen: () => set({ hasSeenSwipeHint: true }),

      isInMarket: () => get().searchScrollY >= MARKET_THRESHOLD_Y,
    }),
    {
      name: 'vertushka-market',
      storage: createJSONStorage(() => AsyncStorage),
      // Версия для miграций — поднимать при breaking-изменении схемы.
      version: 1,
      // hasSeenSwipeHint достаточно сериализовать вместе с searchScrollY.
      partialize: (state) => ({
        searchScrollY: state.searchScrollY,
        hasSeenSwipeHint: state.hasSeenSwipeHint,
      }),
    },
  ),
);
