/**
 * Hero icons — Stamper Outline v3.
 *
 * Концепция: hero — это 3 brand-сущности (heart/disc/gift), у которых дефолт
 * не regular, а filled/duotone. Это даёт узнаваемый силуэт. Всё остальное
 * (trophy, scan, vinyl-label) едет на общем правиле = regular outline.
 *
 * Weight приходит из Icon.tsx (см. HERO_FILL_NAMES / HERO_DUOTONE_NAMES).
 * Эти обёртки только проксируют его в Phosphor.
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

// Пластинка с канавками. По умолчанию Icon.tsx передаёт `duotone` (виден
// рисунок канавок). Tab bar в активном состоянии передаст `fill` явно.
export const DiscGrooves: React.FC<HeroProps> = (p) => <VinylRecordIcon {...p} />;

// Gift-box. По умолчанию Icon.tsx передаёт `duotone`.
// ВАЖНО: НЕ использовать в вишлист-сценариях.
export const GiftVinyl: React.FC<HeroProps> = (p) => <GiftIcon {...p} />;

// Trophy. Обычный outline — больше не «толстый кубок».
export const TrophyDisc: React.FC<HeroProps> = (p) => <TrophyIcon {...p} />;

// Scan-frame — outline.
export const ScanTarget: React.FC<HeroProps> = (p) => <ScanIcon {...p} />;

// Центр VinylSpinner — duotone (как DiscGrooves), смысловой namespace отдельный.
export const VinylLabel: React.FC<HeroProps> = (p) => <VinylRecordIcon {...p} />;
