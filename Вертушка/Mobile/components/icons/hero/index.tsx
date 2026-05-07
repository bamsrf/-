/**
 * Hero icons — 8 кастомных имён из B2 (Stamper Hi-Fi).
 *
 * РЕАЛИЗАЦИЯ: Phosphor Regular/Duotone/Fill weights через прокси на ближайшую
 * семантически подходящую Phosphor-иконку. Это решение принято после revision-
 * итераций B2 v2: frosted-glass / кастомный SVG-набор не сложился, поэтому
 * остаёмся в Phosphor-системе с `weight='duotone'` как default визуальным
 * языком всего набора (см. `Icon.tsx`).
 *
 * Если позже придут финальные кастомные SVG от дизайнера — заменяем содержимое
 * каждой обёртки на свой `<Svg>`, не трогая ни `Icon.tsx` registry, ни этот
 * экспорт. Контракт props (size/color/weight/testID/style) остаётся.
 *
 * Phosphor v3.x: используем `*Icon`-суффиксированные имена (без суффикса —
 * deprecated).
 */

import React from 'react';
import {
  GiftIcon,
  TrophyIcon,
  ScanIcon,
  VinylRecordIcon,
  type IconProps,
} from 'phosphor-react-native';

type HeroProps = IconProps;

// Пластинка с канавками. На Phosphor — VinylRecord (не Disc — disc это CD).
// ВАЖНО: фиксированный `weight='duotone'` — пользователь хочет видеть канавки
// всегда, в любом контексте (и в активном табе, и в карточках). Halo wrapper
// в Icon.tsx всё равно дополнительно рендерит solid backdrop → glow остаётся.
export const DiscGrooves: React.FC<HeroProps> = (p) => (
  <VinylRecordIcon {...p} weight="duotone" />
);

// Gift-box. Метафору «винил внутри подарка» сохраняем семантикой `gift`-имени
// в registry, но визуально — стандартный Phosphor `Gift`.
// ВАЖНО: НЕ использовать в вишлист-сценариях (см. комментарий в Icon.tsx registry).
export const GiftVinyl: React.FC<HeroProps> = (p) => <GiftIcon {...p} />;

// Trophy. Стандартный `Trophy` от Phosphor — без vinyl-наполнения.
export const TrophyDisc: React.FC<HeroProps> = (p) => <TrophyIcon {...p} />;

// Scan-frame.
export const ScanTarget: React.FC<HeroProps> = (p) => <ScanIcon {...p} />;

// Центр VinylSpinner — то же что DiscGrooves, отдельный namespace для смысла.
export const VinylLabel: React.FC<HeroProps> = (p) => <VinylRecordIcon {...p} />;

// Rarity-маркеры (crown / diamond / flame) удалены — пользователь не использует
// иконные маркеры для рарити. Тиры выражаются исключительно через RarityAura.tsx
// (свечение вокруг карточки + пульсация).
