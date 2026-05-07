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
import { useColorScheme, View, type StyleProp, type ViewStyle } from 'react-native';

// Phosphor — core set (44 имени). Все импорты — через `*Icon` суффикс
// (Phosphor 3.x: старые имена без суффикса deprecated).
import {
  PlusIcon,
  PlusCircleIcon,
  WarningCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BellIcon,
  BellSlashIcon,
  BuildingsIcon,
  CalendarIcon,
  CameraIcon,
  CheckIcon,
  CheckCircleIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CaretUpIcon,
  CaretDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  EyeSlashIcon,
  CopyIcon,
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  MusicNotesIcon,
  EnvelopeOpenIcon,
  ChatCircleIcon,
  XIcon,
  XCircleIcon,
  CloudSlashIcon,
  CurrencyCircleDollarIcon,
  DownloadSimpleIcon,
  DotsThreeIcon,
  DotsThreeVerticalIcon,
  FolderIcon,
  GiftIcon,
  GlobeIcon,
  SquaresFourIcon,
  HeartIcon,
  QuestionIcon,
  KeyholeIcon,
  ListIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  LockOpenIcon,
  GoogleLogoIcon,
  EnvelopeIcon,
  MapTrifoldIcon,
  ScanIcon,
  SlidersIcon,
  PencilIcon,
  UserIcon,
  TagIcon,
  ArrowClockwiseIcon,
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
  TrophyDisc,
  VinylLabel,
} from '../icons/hero';

// Polish Vertushka v4 — единый стиль: Phosphor `fill` + halo wrapper. Custom
// SVG-иконки сохранены в `components/icons/custom/index.tsx` как референс,
// но в registry больше не подключены — иначе ломается визуальная консистентность
// с остальным набором (plus, x, pencil, trash, arrow-*, и т.д.). Disc оставляем
// как DiscGrooves по решению пользователя.

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
  /**
   * Имя иконки. Принимает либо новое registry-имя (`'plus'`, `'magnifying-glass'`,
   * `'disc'`, …), либо легаси Ionicon-имя (`'add'`, `'search'`, `'disc-outline'`, …)
   * через alias-таблицу `IONICON_ALIASES` ниже. Это упрощает миграцию: можно
   * просто заменить `<Ionicons>` → `<Icon>` без правки `name`.
   *
   * Также принимает любую `string` — для совместимости с динамическими
   * `name={cond ? 'a' : 'b'}` патернами и legacy `keyof typeof Ionicons.glyphMap`
   * сигнатурами. Если имя не известно — fallback на `'plus'`.
   */
  name: IconName | IoniconAlias | (string & {});
  size?: IconSize | number;
  /**
   * Цвет. Принимает либо семантическую роль (`'brand'`, `'error'`, …), либо
   * raw-строку (hex / rgb). Hex-fallback нужен для постепенной миграции с
   * `Colors.royalBlue` → `color="brand"`. Финальная цель — все вызовы на роли.
   */
  color?: IconColor | string;
  variant?: IconVariant;
  /**
   * Прямой override visual weight. Если не задан — резолвится из variant
   * (default → duotone, active → fill).
   */
  weight?: IconWeight;
  hitSlop?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}

// ───────────────────────────────────────────────────────────────────────────
// Registry — kebab-case → Phosphor / hero component
// ───────────────────────────────────────────────────────────────────────────

// IconComponent — общий interface Phosphor + hero/custom иконок. Custom set
// из `components/icons/custom` принимает совместимые props (size/color/weight),
// поэтому достаточно широкого ComponentType.
type IconComponent = PhosphorIcon | React.ComponentType<any>;

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
  'caret-up':            CaretUpIcon,
  'caret-down':          CaretDownIcon,
  'arrow-up':            ArrowUpIcon,
  'arrow-down':          ArrowDownIcon,
  'eye':                 EyeIcon,
  'eye-slash':           EyeSlashIcon,
  'copy':                CopyIcon,
  'users':               UsersIcon,
  'user-plus':           UserPlusIcon,
  'user-minus':          UserMinusIcon,
  'music-notes':         MusicNotesIcon,
  'envelope-open':       EnvelopeOpenIcon,
  'chat-circle':         ChatCircleIcon,
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

  // HERO set — кастомные SVG, единственные неунифицированные иконки.
  'disc':                DiscGrooves,    // ★ HERO — Phosphor VinylRecord (юзер:
                                          //   «не меняй иконку винила»)
  'gift':                GiftIcon,       // Phosphor — единый язык с остальными.
                                          //   ВАЖНО: НЕ использовать в вишлист-сценариях
                                          //   (юзеру не нравится). Для вишлиста — `heart`.
  'trophy':              TrophyDisc,     // ★ HERO
  'scan':                ScanIcon,       // Phosphor — единый язык.
  'vinyl-label':         VinylLabel,     // ★ HERO центр VinylSpinner
  // 'rarity-*' (crown / diamond / flame) удалены по решению пользователя — rarity
  // выражается аурой через RarityAura.tsx, иконных маркеров не нужно.
} satisfies Record<string, IconComponent>;

export type IconName = keyof typeof REGISTRY;

// ───────────────────────────────────────────────────────────────────────────
// Ionicon legacy aliases — миграция Phase 3.
// Каждое старое имя из @expo/vector-icons маппится на текущее registry-имя.
// Источник — B2 v1 migration table (52 имени из инвентаря Mobile/).
// Дубликаты пар (`disc` + `disc-outline`, `gift` + `gift-outline` etc.)
// унифицированы в одну hero-иконку.
// ───────────────────────────────────────────────────────────────────────────

const IONICON_ALIASES = {
  // Action
  'add':                    'plus',
  'add-circle-outline':     'plus-circle',
  'checkmark':              'check',
  'checkmark-circle':       'check-circle',
  'checkmark-circle-outline': 'check-circle',
  'close':                  'x',
  'close-circle':           'x-circle',
  'close-circle-outline':   'x-circle',
  'pencil':                 'pencil',
  'trash-outline':          'trash',
  'camera-outline':         'camera',
  'mail-outline':           'envelope',
  'download-outline':       'download',
  'share-outline':          'share',
  'refresh':                'arrow-clockwise',
  'refresh-outline':        'arrow-clockwise',
  'heart-outline':          'heart',
  'checkmark-outline':      'check',
  'copy-outline':           'copy',
  'eye-outline':            'eye',
  'eye-off-outline':        'eye-slash',
  'mail-open-outline':      'envelope-open',
  'musical-notes-outline':  'music-notes',
  'chatbubble-outline':     'chat-circle',
  'chatbubbles-outline':    'chat-circle',

  // Navigation
  'arrow-back':             'arrow-left',
  'arrow-forward-outline':  'arrow-right',
  'arrow-forward-circle':   'arrow-right',
  'chevron-back':           'caret-left',
  'chevron-forward':        'caret-right',
  'chevron-up':             'caret-up',
  'chevron-down':           'caret-down',
  'arrow-up':               'arrow-up',
  'arrow-down':             'arrow-down',
  'search':                 'magnifying-glass',
  'search-outline':         'magnifying-glass',
  'scan-outline':           'scan',
  'person':                 'user',
  'person-outline':         'user',
  'people-outline':         'users',
  'person-add-outline':     'user-plus',
  'person-remove-outline':  'user-minus',

  // State
  'alert-circle-outline':   'warning-circle',

  // System
  'notifications-outline':  'bell',
  'notifications-off-outline': 'bell-slash',
  'cloud-offline-outline':  'cloud-slash',
  'lock-open-outline':      'lock-open',
  'help-circle-outline':    'question',
  'keypad-outline':         'keyhole',

  // UI Control
  'ellipsis-horizontal':    'dots-three',
  'ellipsis-vertical':      'dots-three-vertical',
  'grid-outline':           'squares-four',
  'list-outline':           'list',
  'options-outline':        'sliders',
  'swap-vertical-outline':  'arrows-down-up',

  // Domain
  'calendar-outline':       'calendar',
  'time-outline':           'clock',
  'globe-outline':          'globe',
  'business-outline':       'buildings',
  'folder-outline':         'folder',
  'pricetag-outline':       'tag',
  'location-outline':       'map-pin',
  'map-outline':            'map-trifold',
  'cash-outline':           'currency-circle-dollar',
  'star-outline':           'star',

  // Decorative
  'sparkles':               'sparkle',

  // Brand
  'logo-google':            'google-logo',

  // Hero (унификация дубликатов)
  'disc':                   'disc',
  'disc-outline':           'disc',
  'gift':                   'gift',
  'gift-outline':           'gift',
  'trophy':                 'trophy',
} satisfies Record<string, IconName>;

export type IoniconAlias = keyof typeof IONICON_ALIASES;

// ───────────────────────────────────────────────────────────────────────────
// Maps — size, hit-slop, color resolution
// ───────────────────────────────────────────────────────────────────────────

const SIZE_MAP: Record<IconSize, number> = T.icon.sizes as any;
const HIT_SLOP_MAP: Record<IconSize, number> = T.icon.hitSlop as any;

const COLOR_ROLES: Set<string> = new Set(Object.keys(T.icon.colors));

// Resolve семантической роли → palette token → hex (per mode).
// Если color — не семантическая роль, а raw-строка (hex/rgb) — отдаём как есть.
const resolveColor = (color: IconColor | string, mode: 'light' | 'dark'): string => {
  if (!COLOR_ROLES.has(color)) return color; // raw hex/rgb passthrough
  const tokenKey = T.icon.colors[color as IconColor];
  const swatch = T.palette[tokenKey as keyof typeof T.palette];
  return swatch[mode];
};

// Перцептивная светлота: sRGB relative luminance, кат-офф 0.78. Используется
// для отключения halo на белых/околобелых иконках (см. Icon component).
const isLightHex = (input: string): boolean => {
  if (!input || input[0] !== '#') return false;
  let hex = input.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (hex.length !== 6) return false;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  if ([r, g, b].some(Number.isNaN)) return false;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.78;
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

  // Resolve name через alias-таблицу если передано legacy Ionicon-имя.
  const resolvedName: IconName =
    name in REGISTRY
      ? (name as IconName)
      : (IONICON_ALIASES[name as IoniconAlias] ?? ('plus' as IconName));

  // disabled-variant перебивает color на 'disabled'-роль.
  const effectiveColor: IconColor | string =
    variant === 'disabled' ? 'disabled' : color;
  const resolvedColor = resolveColor(effectiveColor, mode);

  // Resolve weight: явный override > variant-маппинг.
  // Default weight = `fill` (твёрдый silhouette) — пользовательский выбор после
  // duotone-итерации. Filled читается контрастнее на rendered экранах.
  const resolvedWeight: IconWeight =
    weightOverride ?? (variant === 'disabled' ? 'duotone' : 'fill');

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
  const Component = REGISTRY[resolvedName] as React.ComponentType<any>;

  // ── Halo glow (Polish Vertushka v4 — единый визуальный маркер набора) ──
  //
  // Под каждой иконкой рендерится её же копия большего размера и пониженной
  // прозрачностью, плюс iOS-shadow на этом слое. На iOS shadow-radius
  // даёт настоящий гауссовский blur вокруг alpha-канала SVG; на Android
  // получаем «layered halo» (масштабированная копия за иконкой).
  //
  // Halo показывается на всех «контентных» размерах. Порог 14pt отсекает
  // совсем мелкие inline-маркеры (badge dots, ≤12pt), где glow смазывает форму.
  //
  // Дополнительно подавляем halo для СВЕТЛЫХ цветов (white-ish иконки
  // на тёмном фоне — например, dots/X внутри cobalt-кнопки): белый halo
  // на белой иконке расплывается в кашу и слипает близкорасположенные
  // элементы (3 точки, например). Считаем перцептивную светлоту через
  // относительную яркость sRGB; > 0.78 → пропускаем halo.
  const isLightColor = isLightHex(resolvedColor);
  const showHalo =
    resolvedSize >= 14 && variant !== 'disabled' && !isLightColor;
  // Halo по референсу Polish v4 (cobalt X / dots с мягкой violet-аурой).
  // scale 1.16 + opacity 0.28; iOS shadow на backdrop-слое (ниже) даёт
  // gaussian blur. Светлые цвета halo пропускают (см. isLightColor выше),
  // потому что белый-на-белом halo превращает 3 точки в одно пятно.
  const haloScale = 1.16;
  const haloOpacity = 0.28;
  const haloSize = Math.round(resolvedSize * haloScale);

  const containerStyle: ViewStyle = {
    width: resolvedSize,
    height: resolvedSize,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <View
      style={[containerStyle, style]}
      hitSlop={
        computedHitSlop
          ? {
              top: computedHitSlop,
              bottom: computedHitSlop,
              left: computedHitSlop,
              right: computedHitSlop,
            }
          : undefined
      }
      testID={testID}
    >
      {showHalo ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            opacity: haloOpacity,
            shadowColor: resolvedColor,
            shadowOffset: { width: 0, height: 0 },
            // Целевой look — мягкий gaussian aura, как на референсе.
            // shadowOpacity 0.75 + radius ≈ 0.32×size = заметная корона
            // вокруг alpha-канала SVG, но всё ещё лёгкая.
            shadowOpacity: 0.75,
            shadowRadius: Math.max(5, resolvedSize * 0.32),
          }}
        >
          <Component size={haloSize} color={resolvedColor} weight="fill" />
        </View>
      ) : null}
      <Component
        size={resolvedSize}
        color={resolvedColor}
        weight={resolvedWeight}
      />
    </View>
  );
};
