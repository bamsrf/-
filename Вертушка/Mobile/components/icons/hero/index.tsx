/**
 * Hero icons — 8 кастомных SVG из B2 Iconography (Stamper Hi-Fi).
 *
 * Реализованы на `react-native-svg` в Phosphor-совместимой системе:
 *   - viewBox 0 0 256 256 (как у Phosphor)
 *   - strokeWidth 16 на 256 ≈ 1.5pt на 24pt (regular weight per B2 spec)
 *   - linecap/linejoin = round
 *   - props совместимы с Phosphor `IconProps` (size, color, weight, ...)
 *
 * Графический язык:
 *   - Концентрические канавки винила (grooves) — domain-сигнал
 *   - Ember-центральная точка для disc-семейства
 *   - Геометрия rarity-маркеров читается на 12pt (минимум)
 *
 * Weight handling:
 *   - 'regular' (default) — outline, как в B2 спеке
 *   - 'fill' — заливка primary-фигуры; для составных hero (disc-grooves,
 *     vinyl-label) fill = solid disc + контрастные grooves через alpha.
 *   - Прочие Phosphor weights ('thin'|'light'|'bold'|'duotone') ↔ regular.
 */

import React from 'react';
import Svg, { Circle, Path, Line, Rect, G } from 'react-native-svg';
import type { IconProps } from 'phosphor-react-native';

type HeroProps = IconProps;

// Универсальный нормалайзер пропсов
const useHero = (p: HeroProps) => {
  const sizeRaw = p.size ?? 24;
  const size = typeof sizeRaw === 'number' ? sizeRaw : parseFloat(sizeRaw as string);
  const color = (p.color as string) ?? '#000';
  const isFilled = p.weight === 'fill';
  return { size, color, isFilled };
};

// ──────────────────────────────────────────────────────────────────────────
// 1. disc-grooves — пластинка с канавками + ember-центр.
// Tab bar, empty state, onboarding. Sizes: 16 / 24 / 48.
// ──────────────────────────────────────────────────────────────────────────
export const DiscGrooves: React.FC<HeroProps> = (p) => {
  const { size, color, isFilled } = useHero(p);
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={p.testID}>
      {isFilled ? (
        // Filled — solid disc, канавки выбиты прозрачностью
        <G>
          <Circle cx={128} cy={128} r={108} fill={color} />
          <Circle cx={128} cy={128} r={86} fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={2} />
          <Circle cx={128} cy={128} r={66} fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={2} />
          <Circle cx={128} cy={128} r={46} fill="none" stroke="#FFFFFF" strokeOpacity={0.18} strokeWidth={2} />
          <Circle cx={128} cy={128} r={26} fill="#FFFFFF" />
          <Circle cx={128} cy={128} r={8} fill={color} />
        </G>
      ) : (
        <G>
          <Circle cx={128} cy={128} r={108} fill="none" stroke={color} strokeWidth={16} />
          <Circle cx={128} cy={128} r={86} fill="none" stroke={color} strokeWidth={4} />
          <Circle cx={128} cy={128} r={66} fill="none" stroke={color} strokeWidth={4} />
          <Circle cx={128} cy={128} r={46} fill="none" stroke={color} strokeWidth={4} />
          <Circle cx={128} cy={128} r={26} fill="none" stroke={color} strokeWidth={10} />
          <Circle cx={128} cy={128} r={8} fill={color} />
        </G>
      )}
    </Svg>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 2. gift-vinyl — gift-box с пластинкой как акцент сверху (вместо банта).
// Profile, GiftGivenItem, booked badge. Sizes: 20 / 24.
// ──────────────────────────────────────────────────────────────────────────
export const GiftVinyl: React.FC<HeroProps> = (p) => {
  const { size, color, isFilled } = useHero(p);
  const fillBox = isFilled ? color : 'none';
  const fillOnDark = isFilled ? '#FFFFFF' : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={p.testID}>
      {/* Лид (крышка) */}
      <Rect x={32} y={88} width={192} height={32} rx={4} ry={4}
        fill={fillBox} stroke={color} strokeWidth={16} strokeLinejoin="round" />
      {/* Тело коробки */}
      <Rect x={48} y={120} width={160} height={104} rx={4} ry={4}
        fill={fillBox} stroke={color} strokeWidth={16} strokeLinejoin="round" />
      {/* Вертикальная лента */}
      <Line x1={128} y1={88} x2={128} y2={224} stroke={color} strokeWidth={12} strokeLinecap="round" />
      {/* Мини-пластинка вместо банта */}
      <Circle cx={128} cy={56} r={28} fill={fillOnDark} stroke={color} strokeWidth={12} />
      <Circle cx={128} cy={56} r={6} fill={color} />
    </Svg>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 3. trophy-disc — кубок с пластинкой в чаше. Achievements, top collector.
// Sizes: 20 / 32 / 48.
// ──────────────────────────────────────────────────────────────────────────
export const TrophyDisc: React.FC<HeroProps> = (p) => {
  const { size, color, isFilled } = useHero(p);
  const fillCup = isFilled ? color : 'none';
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={p.testID}>
      {/* Чаша */}
      <Path
        d="M 64 40 L 64 116 Q 64 172 128 172 Q 192 172 192 116 L 192 40 Z"
        fill={fillCup} stroke={color} strokeWidth={16} strokeLinejoin="round"
      />
      {/* Левая ручка */}
      <Path d="M 64 56 Q 28 56 28 96 Q 28 128 64 132" fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" />
      {/* Правая ручка */}
      <Path d="M 192 56 Q 228 56 228 96 Q 228 128 192 132" fill="none" stroke={color} strokeWidth={12} strokeLinecap="round" />
      {/* Стержень */}
      <Line x1={128} y1={172} x2={128} y2={204} stroke={color} strokeWidth={16} strokeLinecap="round" />
      {/* Основание */}
      <Rect x={80} y={204} width={96} height={16} rx={4} ry={4} fill={color} />
      {/* Винил-медальон в центре чаши */}
      <Circle cx={128} cy={104} r={32} fill="none" stroke={color} strokeWidth={8} />
      <Circle cx={128} cy={104} r={6} fill={color} />
    </Svg>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 4. scan-target — рамка сканера с прицелом и barcode внутри.
// Tab bar Сканер. Sizes: 24 / 48.
// ──────────────────────────────────────────────────────────────────────────
export const ScanTarget: React.FC<HeroProps> = (p) => {
  const { size, color } = useHero(p);
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={p.testID}>
      {/* 4 corner brackets */}
      <Path d="M 32 80 L 32 32 L 80 32" fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M 176 32 L 224 32 L 224 80" fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M 32 176 L 32 224 L 80 224" fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M 176 224 L 224 224 L 224 176" fill="none" stroke={color} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
      {/* Barcode strips внутри */}
      <Line x1={84}  y1={96} x2={84}  y2={160} stroke={color} strokeWidth={10} strokeLinecap="round" />
      <Line x1={108} y1={96} x2={108} y2={160} stroke={color} strokeWidth={4}  strokeLinecap="round" />
      <Line x1={128} y1={96} x2={128} y2={160} stroke={color} strokeWidth={10} strokeLinecap="round" />
      <Line x1={148} y1={96} x2={148} y2={160} stroke={color} strokeWidth={4}  strokeLinecap="round" />
      <Line x1={172} y1={96} x2={172} y2={160} stroke={color} strokeWidth={8}  strokeLinecap="round" />
    </Svg>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 5. rarity-crown — маркер тира «Коллекционка». Читается на 12pt.
// Sizes: 12 / 16.
// ──────────────────────────────────────────────────────────────────────────
export const RarityCrown: React.FC<HeroProps> = (p) => {
  const { size, color, isFilled } = useHero(p);
  // Зигзаг 5 зубцов (3 высоких + 2 низких) + база
  const d = 'M 32 88 L 64 144 L 96 56 L 128 144 L 160 56 L 192 144 L 224 88 L 224 200 L 32 200 Z';
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={p.testID}>
      <Path d={d} fill={isFilled ? color : 'none'} stroke={color} strokeWidth={16} strokeLinejoin="round" strokeLinecap="round" />
      {/* 3 камня */}
      <Circle cx={64}  cy={172} r={6} fill={color} />
      <Circle cx={128} cy={172} r={6} fill={color} />
      <Circle cx={192} cy={172} r={6} fill={color} />
    </Svg>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 6. rarity-diamond — маркер тира «Лимитка». Геометрический ромб.
// Sizes: 12 / 16.
// ──────────────────────────────────────────────────────────────────────────
export const RarityDiamond: React.FC<HeroProps> = (p) => {
  const { size, color, isFilled } = useHero(p);
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={p.testID}>
      <Path
        d="M 128 32 L 224 128 L 128 224 L 32 128 Z"
        fill={isFilled ? color : 'none'}
        stroke={color}
        strokeWidth={16}
        strokeLinejoin="round"
      />
      {/* Грани (горизонталь + V сверху) */}
      <Line x1={32} y1={128} x2={224} y2={128} stroke={color} strokeWidth={8} />
      <Path d="M 80 80 L 128 128 L 176 80" fill="none" stroke={color} strokeWidth={8} strokeLinejoin="round" />
    </Svg>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 7. rarity-flame — маркер тира «HOT». Угловатый огонёк.
// Sizes: 12 / 16.
// ──────────────────────────────────────────────────────────────────────────
export const RarityFlame: React.FC<HeroProps> = (p) => {
  const { size, color, isFilled } = useHero(p);
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={p.testID}>
      {/* Внешний контур пламени */}
      <Path
        d="M 128 24 Q 80 88 88 132 Q 56 156 56 188 Q 56 232 128 232 Q 200 232 200 188 Q 200 156 168 132 Q 176 88 128 24 Z"
        fill={isFilled ? color : 'none'}
        stroke={color}
        strokeWidth={16}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Внутреннее пламя — только в outline-режиме */}
      {!isFilled && (
        <Path
          d="M 128 96 Q 104 132 112 168 Q 112 196 128 208 Q 144 196 144 168 Q 152 132 128 96 Z"
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
};

// ──────────────────────────────────────────────────────────────────────────
// 8. vinyl-label — round badge для центра VinylSpinner. Концентрические
// канавки с центральной точкой — без текста (текст рисуется сверху отдельно
// через RubikMonoOne, как сейчас в VinylSpinner.tsx).
// Sizes: 24 / 32.
// ──────────────────────────────────────────────────────────────────────────
export const VinylLabel: React.FC<HeroProps> = (p) => {
  const { size, color, isFilled } = useHero(p);
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={p.testID}>
      {isFilled ? (
        <G>
          <Circle cx={128} cy={128} r={108} fill={color} />
          <Circle cx={128} cy={128} r={68} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={2} />
          <Circle cx={128} cy={128} r={44} fill="none" stroke="#FFFFFF" strokeOpacity={0.22} strokeWidth={2} />
          <Circle cx={128} cy={128} r={10} fill="#FFFFFF" />
        </G>
      ) : (
        <G>
          <Circle cx={128} cy={128} r={108} fill="none" stroke={color} strokeWidth={16} />
          <Circle cx={128} cy={128} r={68} fill="none" stroke={color} strokeWidth={4} />
          <Circle cx={128} cy={128} r={44} fill="none" stroke={color} strokeWidth={4} />
          <Circle cx={128} cy={128} r={10} fill={color} />
        </G>
      )}
    </Svg>
  );
};
