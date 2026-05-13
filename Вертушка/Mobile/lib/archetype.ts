/**
 * Архетипы коллекционера — автоматически выводимая «маркировка» юзера.
 *
 * Один юзер = один активный архетип (наивысший приоритет в таблице ниже).
 * Архетип не косметика — он живёт рядом с косметикой и обновляется на лету
 * из MyAchievementsResponse. Полная спецификация: PLAN_ACHIEVEMENTS_V2.md §5.6.
 */
import type { AchievementTierKey, MyAchievementsResponse } from './types';
import { unlockedCodes } from './achievementHelpers';

export interface ArchetypeInfo {
  key: string;
  label: string;
  /** Дискретная подпись для tooltip / поясняющая ленточка */
  blurb: string;
  /** Цвет обводки в стиле тира главного триггера */
  tierKey: AchievementTierKey;
}

const FOLLOWER_THRESHOLD = 5;

type Predicate = (codes: Set<string>) => boolean;

interface Rule extends ArchetypeInfo {
  match: Predicate;
}

const RULES: Rule[] = [
  {
    key: 'evangelist',
    label: 'Эпидемиолог',
    blurb: 'Привёл круг коллекционеров.',
    tierKey: 'legend',
    match: (c) => c.has('META_evangelist'),
  },
  {
    key: 'scientist',
    label: 'Учёный',
    blurb: 'Дискография, версии, лейблы — закрыто.',
    tierKey: 'legend',
    match: (c) => c.has('META_depth'),
  },
  {
    key: 'archivist',
    label: 'Архивист',
    blurb: 'Большая, любимая, ухоженная коллекция.',
    tierKey: 'legend',
    match: (c) => c.has('META_scale') || c.has('B5_keeper') || c.has('B6_warden'),
  },
  {
    key: 'resident',
    label: 'Резидент',
    blurb: 'Сильное сообщество вокруг.',
    tierKey: 'epic',
    match: (c) => c.has('META_community'),
  },
  {
    key: 'polymath',
    label: 'Эрудит',
    blurb: 'Всеяден жанрово.',
    tierKey: 'epic',
    match: (c) => c.has('META_genres'),
  },
  {
    key: 'cartographer',
    label: 'Картограф',
    blurb: 'Кругосветка пройдена.',
    tierKey: 'epic',
    match: (c) => c.has('META_geography'),
  },
  {
    key: 'eras_keeper',
    label: 'Хранитель эпох',
    blurb: 'Каждое десятилетие на полке.',
    tierKey: 'legend',
    match: (c) => c.has('META_eras'),
  },
  {
    key: 'grail_hunter',
    label: 'Охотник за Граалем',
    blurb: 'Коллекционки + лимитки + тренды.',
    tierKey: 'epic',
    match: (c) => c.has('META_rarity'),
  },
  {
    key: 'gifter',
    label: 'Дарящая рука',
    blurb: 'Социальный жест через подарки.',
    tierKey: 'epic',
    match: (c) => c.has('META_gifts'),
  },
  {
    key: 'searcher',
    label: 'Меломан-сёрчер',
    blurb: 'Ищет, фолловит, копит.',
    tierKey: 'notable',
    match: (c) =>
      c.has('K7_mutual_x10') && c.has('K1_following_x5') && c.has('B3_archivist'),
  },
  {
    key: 'quiet_collector',
    label: 'Тихий собиратель',
    blurb: 'Коллекционирует без шума.',
    tierKey: 'notable',
    match: (c) =>
      c.has('B3_archivist') &&
      !c.has('META_community') &&
      // подписан мало (5 = K1, если нет K1 — точно мало)
      !c.has('K1_following_x5'),
  },
  {
    key: 'selecta',
    label: 'Селекта',
    blurb: 'Глубокий в одном жанре.',
    tierKey: 'rare',
    match: (c) =>
      c.has('F3_jazz_x25') ||
      c.has('F4_electronic_x25') ||
      c.has('F5_classical_x15') ||
      c.has('F6_rock_x25'),
  },
  {
    key: 'melomane',
    label: 'Меломан',
    blurb: 'Прошёл онбординг, реально слушает.',
    tierKey: 'notable',
    match: (c) => c.has('META_foundation') && c.has('B1_starter'),
  },
];

export function computeArchetype(data: MyAchievementsResponse): ArchetypeInfo | null {
  const codes = unlockedCodes(data);
  if (codes.size < 3) {
    return {
      key: 'rookie',
      label: 'Новичок',
      blurb: 'Только начинаем.',
      tierKey: 'simple',
    };
  }
  for (const rule of RULES) {
    if (rule.match(codes)) {
      const { match: _omit, ...info } = rule;
      return info;
    }
  }
  return {
    key: 'rookie',
    label: 'Новичок',
    blurb: 'Только начинаем.',
    tierKey: 'simple',
  };
}
