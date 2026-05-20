/**
 * FormatChips — горизонтальный ряд фильтров формата для Маркета.
 *
 * Чипы: Все / Винил / CD / Кассеты. Single-select (radio); default = 'all'.
 * Активный чип подсвечивается тем же ember-gradient'ом, что у HotStockTag —
 * это даёт визуальную преемственность «огонь = в продаже».
 *
 * Серверный mapping (выполняется в API-вызовах в /market/search и
 * /market/stores/{slug}/listings):
 *   - vinyl     → LP, 2xLP, EP, Single, 12", 7", 10"
 *   - cd        → CD, SACD
 *   - cassette  → Cassette
 *   - all       → нет format-фильтра
 *
 * Box Set в Phase 1 относится к vinyl (см. MARKET_AND_PRICE_DRAWER.md §1.8).
 *
 * Источник: screens-market.jsx (Chip + ChipRow атомы) +
 *           docs/plans/MARKET_AND_PRICE_DRAWER.md §1.8.
 */
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon, type IconName } from '../ui/Icon';
import { Gradients, MarketPalette } from '../../constants/theme';

export type MarketFormat = 'all' | 'vinyl' | 'cd' | 'cassette';

interface FormatChip {
  value: MarketFormat;
  label: string;
  /**
   * Иконка из Icon registry. NB: 'disc' для vinyl даёт duotone HERO —
   * визуально это правильно, потому что vinyl-чип = главный.
   * Для cd/cassette — нужны generic outline иконки.
   */
  icon: IconName;
}

const CHIPS: readonly FormatChip[] = [
  { value: 'all',      label: 'Все',     icon: 'squares-four' },
  { value: 'vinyl',    label: 'Винил',   icon: 'disc' },
  { value: 'cd',       label: 'CD',      icon: 'disc' },        // нет compact-disc в registry — fallback на disc
  { value: 'cassette', label: 'Кассеты', icon: 'tag' },          // нет cassette-tape в registry — fallback (TODO: добавить hero иконку)
];

interface FormatChipsProps {
  value: MarketFormat;
  onChange: (v: MarketFormat) => void;
  /** Маркет-фон (dark) или обычный (light) — для тинта inactive-чипов. */
  tint?: 'dark' | 'light';
  style?: StyleProp<ViewStyle>;
}

export function FormatChips({
  value,
  onChange,
  tint = 'dark',
  style,
}: FormatChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={[styles.scroll, style]}
    >
      {CHIPS.map((chip) => (
        <ChipButton
          key={chip.value}
          chip={chip}
          active={chip.value === value}
          tint={tint}
          onPress={() => onChange(chip.value)}
        />
      ))}
    </ScrollView>
  );
}

// ────────────────────────────────────────────────────────────────────────

interface ChipButtonProps {
  chip: FormatChip;
  active: boolean;
  tint: 'dark' | 'light';
  onPress: () => void;
}

function ChipButton({ chip, active, tint, onPress }: ChipButtonProps) {
  // Унифицированная геометрия: outer Pressable с одинаковой padding/border
  // для всех 4 состояний → нет re-layout-jitter'а при tap. Background-различия
  // создаются ОВЕРЛЕЕМ (absoluteFill LinearGradient) или backgroundColor — но
  // никогда не меняют размеры контейнера.
  const isMarket = tint === 'dark';
  const wrapStyle = [
    styles.chip,
    isMarket
      ? (active ? styles.chipMarketActive : styles.chipMarketInactive)
      : (active ? styles.chipLightActive : styles.chipLightInactive),
  ];

  const iconColor = isMarket || active ? 'onBrand' : 'secondary';
  const iconOpacity = isMarket && !active ? 0.75 : 1;

  return (
    <Pressable onPress={onPress} hitSlop={6} style={wrapStyle}>
      {/* Active + dark — ember gradient через absolute overlay (без layout-jitter) */}
      {active && isMarket && (
        <LinearGradient
          colors={Gradients.hotStock}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
      <Icon
        name={chip.icon}
        size={14}
        color={iconColor}
        style={{ opacity: iconOpacity }}
      />
      <Text
        style={[
          styles.label,
          active && styles.labelActive,
          isMarket && !active && styles.labelInactiveDark,
          !isMarket && !active && styles.labelInactiveLight,
        ]}
      >
        {chip.label}
      </Text>
    </Pressable>
  );
}

// ────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
  },
  row: {
    paddingHorizontal: 20,
    paddingTop: 14, // отступ от MarketSearchInput выше (раньше чипы льнули)
    paddingBottom: 12,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    overflow: 'hidden',
    // Все 4 состояния используют тот же border-width (1pt) — иначе ширина
    // прыгает на 0.5-1dp при tap и весь чип-row пересчитывается.
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipMarketActive: {
    // border делается прозрачным (ember-gradient fill сам себе хайлайн).
    // НЕТ shadow.glowEmber — он outset и заставляет ScrollView пересчитать
    // contentSize на каждый tap (это и был основной источник «дёргания»).
  },
  chipMarketInactive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: MarketPalette.chrome.border,
  },
  chipLightActive: {
    backgroundColor: '#FFFFFF',
  },
  chipLightInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DEE2EB',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    fontWeight: '600',
    color: '#0E121C',
    includeFontPadding: false,
  },
  labelActive: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontWeight: '700',
  },
  labelInactiveDark: {
    color: 'rgba(255,255,255,0.75)',
  },
  labelInactiveLight: {
    color: '#4D5263',
  },
});

export default FormatChips;
