/**
 * <Icon> — единый wrapper для всех иконок приложения (B2 Iconography).
 *
 * ▶ Принципы (B2):
 *   - Outline default; filled только для active state.
 *   - Размеры через семантические пресеты (xs|sm|md|lg|xl).
 *   - Цвет через семантическую роль (default|brand|accent|state.*|onBrand|disabled),
 *     НЕ через hex. Маппинг роль→hex резолвится из T.palette[*][mode].
 *   - Touch target ≥44pt автоматически (auto-hitSlop).
 *
 * ▶ ВАЖНО — НЕ ИМПОРТИРУЙ Ionicons или phosphor-react-native НАПРЯМУЮ.
 *   Только через этот компонент. Это инвариант B2 — гарантирует, что
 *   стилистика не «расползётся» обратно в outline+filled mix.
 *   ESLint-rule на эту тему — отдельная задача, пока соблюдается code review-ом.
 *
 * ▶ Имена в registry — kebab-case (как в Ionicons), маппнуты на Phosphor PascalCase
 *   через мигра-таблицу из B2 Iconography (`Polish Vertushka (2).zip` →
 *   `b2-artboard-07-migration.jsx`). Кастомные hero-icons префиксованы `★` и
 *   живут в `components/icons/hero/`.
 *
 * Пример:
 *   <Icon name="disc" size="md" color="brand" variant="active" />
 *   <Icon name="gift" size="sm" color="onBrand" />
 *   <Icon name="warning-circle" size="sm" color="error" />
 */

import React from 'react';
import { useColorScheme, type StyleProp, type ViewStyle } from 'react-native';

// Phosphor — core set (44 имени). Все импорты — через `*Icon` суффикс
// (Phosphor 3.x: старые имена без суффикса deprecated).
import {
  PlusIcon,
  PlusCircleIcon,
  WarningCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BuildingsIcon,
  CalendarIcon,
  CameraIcon,
  CurrencyCircleDollarIcon,
  CheckIcon,
  CheckCircleIcon,
  CaretLeftIcon,
  CaretRightIcon,
  XIcon,
  XCircleIcon,
  CloudSlashIcon,
  DownloadSimpleIcon,
  DotsThreeIcon,
  DotsThreeVerticalIcon,
  FolderIcon,
  GlobeIcon,
  SquaresFourIcon,
  HeartIcon,
  QuestionIcon,
  KeyholeIcon,
  ListIcon,
  MapPinIcon,
  LockOpenIcon,
  GoogleLogoIcon,
  EnvelopeIcon,
  MapTrifoldIcon,
  BellSlashIcon,
  BellIcon,
  SlidersIcon,
  PencilIcon,
  UserIcon,
  TagIcon,
  ArrowClockwiseIcon,
  MagnifyingGlassIcon,
  ShareNetworkIcon,
  SparkleIcon,
  StarIcon,
  ArrowsDownUpIcon,
  ClockIcon,
  TrashIcon,
  type Icon as PhosphorIcon,
} from 'phosphor-react-native';

import {
  DiscGrooves,
  GiftVinyl,
  TrophyDisc,
  ScanTarget,
  RarityCrown,
  RarityDiamond,
  RarityFlame,
  VinylLabel,
} from '../icons/hero';

import { T } from '../../constants/theme';

// ───────────────────────────────────────────────────────────────────────────
// Public API types
// ───────────────────────────────────────────────────────────────────────────

export type IconColor =
  | 'default'
  | 'secondary'
  | 'primary'
  | 'brand'
  | 'accent'
  | 'success'
  | 'error'
  | 'warning'
  | 'onBrand'
  | 'disabled';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export type IconVariant = 'default' | 'active' | 'disabled';

// Phosphor weights, которые мы реально используем. `regular` — outline (B2 default),
// `duotone` — два слоя с разной opacity (визуально мягче, дополнительный «характер»),
// `fill` — solid silhouette (для active state).
export type IconWeight = 'regular' | 'duotone' | 'fill';

export interface IconProps {
  name: IconName;
  size?: IconSize | number;
  color?: IconColor;
  variant?: IconVariant;
  /**
   * Прямой override visual weight. Если не задан — резолвится из variant
   * (default → regular, active → fill, disabled → regular).
   */
  weight?: IconWeight;
  hitSlop?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

// ───────────────────────────────────────────────────────────────────────────
// Registry — kebab-case → Phosphor / hero component
// ───────────────────────────────────────────────────────────────────────────

// IconComponent — общий interface Phosphor + hero-icon обёрток. Hero сейчас
// прокси на Phosphor (`React.FC<PhosphorIconProps>`), поэтому типы совпадают
// с Phosphor's `Icon = React.FC<IconProps>`.
type IconComponent = PhosphorIcon;

const REGISTRY = {
  // Action
  'plus':                PlusIcon,
  'plus-circle':         PlusCircleIcon,
  'check':               CheckIcon,
  'check-circle':        CheckCircleIcon,
  'x':                   XIcon,
  'x-circle':            XCircleIcon,
  'pencil':              PencilIcon,
  'trash':               TrashIcon,
  'camera':              CameraIcon,
  'envelope':            EnvelopeIcon,
  'download':            DownloadSimpleIcon,
  'share':               ShareNetworkIcon,
  'arrow-clockwise':     ArrowClockwiseIcon,
  'heart':               HeartIcon,

  // Navigation
  'arrow-left':          ArrowLeftIcon,
  'arrow-right':         ArrowRightIcon,
  'caret-left':          CaretLeftIcon,
  'caret-right':         CaretRightIcon,
  'magnifying-glass':    MagnifyingGlassIcon,
  'user':                UserIcon,

  // State
  'warning-circle':      WarningCircleIcon,

  // System
  'bell':                BellIcon,
  'bell-slash':          BellSlashIcon,
  'cloud-slash':         CloudSlashIcon,
  'lock-open':           LockOpenIcon,
  'question':            QuestionIcon,
  'keyhole':             KeyholeIcon,

  // UI Control
  'dots-three':          DotsThreeIcon,
  'dots-three-vertical': DotsThreeVerticalIcon,
  'squares-four':        SquaresFourIcon,
  'list':                ListIcon,
  'sliders':             SlidersIcon,
  'arrows-down-up':      ArrowsDownUpIcon,

  // Domain
  'calendar':            CalendarIcon,
  'clock':               ClockIcon,
  'globe':               GlobeIcon,
  'buildings':           BuildingsIcon,
  'folder':              FolderIcon,
  'tag':                 TagIcon,
  'map-pin':             MapPinIcon,
  'map-trifold':         MapTrifoldIcon,
  'currency-circle-dollar': CurrencyCircleDollarIcon,
  'star':                StarIcon,

  // Decorative
  'sparkle':             SparkleIcon,

  // Brand
  'google-logo':         GoogleLogoIcon,

  // CUSTOM hero set — 8 SVG из components/icons/hero/.
  'disc':                DiscGrooves,    // ★ замещает Ionicons disc / disc-outline
  'gift':                GiftVinyl,      // ★ замещает gift / gift-outline
  'trophy':              TrophyDisc,     // ★
  'scan':                ScanTarget,     // ★ домен Сканер
  'rarity-crown':        RarityCrown,    // ★ маркер тира
  'rarity-diamond':      RarityDiamond,  // ★
  'rarity-flame':        RarityFlame,    // ★
  'vinyl-label':         VinylLabel,     // ★ центр VinylSpinner
} satisfies Record<string, IconComponent>;

export type IconName = keyof typeof REGISTRY;

// ───────────────────────────────────────────────────────────────────────────
// Maps — size, hit-slop, color resolution
// ───────────────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<IconSize, number> = T.icon.sizes as any;
const HIT_SLOP_MAP: Record<IconSize, number> = T.icon.hitSlop as any;

// Resolve семантической роли → palette token → hex (per mode).
const resolveColor = (role: IconColor, mode: 'light' | 'dark'): string => {
  const tokenKey = T.icon.colors[role];
  const swatch = T.palette[tokenKey as keyof typeof T.palette];
  return swatch[mode];
};

// ───────────────────────────────────────────────────────────────────────────
// Component
// ───────────────────────────────────────────────────────────────────────────

export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  color = 'default',
  variant = 'default',
  weight: weightOverride,
  hitSlop: hitSlopOverride,
  testID,
  style,
}) => {
  const scheme = useColorScheme();
  const mode: 'light' | 'dark' = scheme === 'dark' ? 'dark' : 'light';

  const resolvedSize = typeof size === 'number' ? size : SIZE_MAP[size];

  const effectiveColor: IconColor = variant === 'disabled' ? 'disabled' : color;
  const resolvedColor = resolveColor(effectiveColor, mode);

  // Resolve weight: явный override > variant-маппинг.
  const resolvedWeight: IconWeight =
    weightOverride ?? (variant === 'active' ? 'fill' : 'regular');

  // Auto hitSlop: пресет → таблица; число → высчитать так, чтобы общий
  // touch target был ≥ 44pt.
  const computedHitSlop =
    hitSlopOverride ??
    (typeof size === 'string'
      ? HIT_SLOP_MAP[size]
      : Math.max(0, Math.ceil((44 - resolvedSize) / 2)));

  // `as any` cast: REGISTRY-values имеют Phosphor's IconProps, но в локальном
  // scope этого файла наш собственный `IconProps` shadowит Phosphor's, и JSX
  // type-check падает на name conflict. Cast безопасен: REGISTRY типизирован
  // через `satisfies Record<string, IconComponent>` выше.
  const Component = REGISTRY[name] as React.ComponentType<any>;

  return (
    <Component
      size={resolvedSize}
      color={resolvedColor}
      weight={resolvedWeight}
      hitSlop={computedHitSlop}
      testID={testID}
      style={style as any}
    />
  );
};
