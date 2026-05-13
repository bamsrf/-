/**
 * Утилиты над MyAchievementsResponse: «самая редкая открытая»,
 * собирание свежих, подсчёты для архетипа и т. д.
 *
 * Все функции pure — на стороне клиента, без сетевых запросов.
 */
import type {
  AchievementItem,
  AchievementSeriesItem,
  AchievementTierKey,
  MyAchievementsResponse,
} from './types';

const TIER_ORDER: Record<AchievementTierKey, number> = {
  simple: 1,
  notable: 2,
  rare: 3,
  epic: 4,
  legend: 5,
};

/** Возвращает все открытые ачивки, плоским массивом, отсортированные по тиру (DESC),
 *  потом по дате анлока (DESC). */
export function collectUnlocked(
  data: MyAchievementsResponse,
  extraRandom: AchievementItem[] = [],
): AchievementItem[] {
  const result: AchievementItem[] = [];
  for (const series of data.series) {
    for (const item of series.items) {
      if (item.is_unlocked) result.push(item);
    }
  }
  for (const item of extraRandom) {
    if (item.is_unlocked) result.push(item);
  }
  result.sort((a, b) => {
    const ta = TIER_ORDER[a.tier.key] || 0;
    const tb = TIER_ORDER[b.tier.key] || 0;
    if (ta !== tb) return tb - ta;
    const da = a.unlocked_at ? Date.parse(a.unlocked_at) : 0;
    const db = b.unlocked_at ? Date.parse(b.unlocked_at) : 0;
    return db - da;
  });
  return result;
}

export function rarestUnlocked(
  data: MyAchievementsResponse,
  extraRandom: AchievementItem[] = [],
): AchievementItem | null {
  const all = collectUnlocked(data, extraRandom);
  return all[0] || null;
}

export function recentUnlocked(
  data: MyAchievementsResponse,
  limit: number,
  extraRandom: AchievementItem[] = [],
): AchievementItem[] {
  const items: AchievementItem[] = [];
  for (const series of data.series) {
    for (const item of series.items) {
      if (item.is_unlocked) items.push(item);
    }
  }
  for (const item of extraRandom) {
    if (item.is_unlocked) items.push(item);
  }
  items.sort((a, b) => {
    const ta = a.unlocked_at ? Date.parse(a.unlocked_at) : 0;
    const tb = b.unlocked_at ? Date.parse(b.unlocked_at) : 0;
    return tb - ta;
  });
  return items.slice(0, limit);
}

/** Список ачивок-series-meta (META_*) — нужны для архетипов. */
export function unlockedMetaCodes(data: MyAchievementsResponse): Set<string> {
  const s = new Set<string>();
  for (const series of data.series) {
    for (const item of series.items) {
      if (item.is_unlocked && item.is_meta) s.add(item.code);
    }
  }
  return s;
}

export function unlockedCodes(data: MyAchievementsResponse): Set<string> {
  const s = new Set<string>();
  for (const series of data.series) {
    for (const item of series.items) {
      if (item.is_unlocked) s.add(item.code);
    }
  }
  return s;
}

export function findSeries(
  data: MyAchievementsResponse,
  key: string,
): AchievementSeriesItem | null {
  return data.series.find((s) => s.key === key) || null;
}
