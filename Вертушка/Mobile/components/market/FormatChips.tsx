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
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

import { Icon, type IconName } from '../ui/Icon';
import { Gradients, MarketPalette, Shadows } from '../../constants/theme';

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
  // ── Active + dark + hot (market) — ember gradient ──────────────────
  if (active && tint === 'dark') {
    return (
      <Pressable onPress={onPress} hitSlop={6}>
        <LinearGradient
          colors={Gradients.hotStock}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.chip,
            styles.chipActiveHot,
            {
              ...Shadows.glowEmber,
              shadowOpacity: 0.25,
              shadowRadius: 12,
            },
          ]}
        >
          <Icon name={chip.icon} size={14} color="onBrand" />
          <Text style={[styles.label, styles.labelActiveHot]}>{chip.label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  // ── Active + light (обычный поиск) — solid dark fill ────────────────
  if (active) {
    return (
      <Pressable onPress={onPress} hitSlop={6} style={[styles.chip, styles.chipActiveLight]}>
        <Icon name={chip.icon} size={14} color="onBrand" />
        <Text style={[styles.label, styles.labelOnDark]}>{chip.label}</Text>
      </Pressable>
    );
  }

  // ── Inactive + dark (market) — glass на тёмном фоне ─────────────────
  if (tint === 'dark') {
    return (
      <Pressable onPress={onPress} hitSlop={6}>
        <BlurView
          intensity={12}
          tint="dark"
          style={[
            styles.chip,
            styles.chipInactiveDark,
          ]}
        >
          <Icon
            name={chip.icon}
            size={14}
            color="onBrand"
            style={{ opacity: 0.75 }}
          />
          <Text style={[styles.label, styles.labelInactiveDark]}>{chip.label}</Text>
        </BlurView>
      </Pressable>
    );
  }

  // ── Inactive + light — обычный outline ──────────────────────────────
  return (
    <Pressable onPress={onPress} hitSlop={6} style={[styles.chip, styles.chipInactiveLight]}>
      <Icon name={chip.icon} size={14} color="secondary" />
      <Text style={[styles.label, styles.labelInactiveLight]}>{chip.label}</Text>
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
  },
  chipActiveHot: {
    // gradient fill через LinearGradient; padding/radius наследуются
  },
  chipActiveLight: {
    backgroundColor: '#FFFFFF',
  },
  chipInactiveDark: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MarketPalette.chrome.border,
  },
  chipInactiveLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DEE2EB',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
    fontWeight: '600',
    includeFontPadding: false,
  },
  labelActiveHot: {
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    color: '#FFFFFF',
  },
  labelOnDark: {
    color: '#FFFFFF',
  },
  labelInactiveDark: {
    color: 'rgba(255,255,255,0.75)',
  },
  labelInactiveLight: {
    color: '#4D5263',
  },
});

export default FormatChips;
