/**
 * AchievementPin — визуальный плейсхолдер эмалевого пина до прихода реальных SVG.
 *
 * Цвета берутся из тира (color_hex из API). Заблокированные ачивки рендерятся в
 * приглушённой палитре с замочком. Скрытые (hidden + не открытые) — серый с «?».
 */
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { AchievementItem } from '../lib/types';

type PinSize = 56 | 72 | 96 | 140;

interface Props {
  item: AchievementItem;
  size?: PinSize;
  style?: StyleProp<ViewStyle>;
}

const SIZE_FONT_RATIO = 0.28; // высота буквы относительно диаметра
const SIZE_ICON_RATIO = 0.45;
const SIZE_BORDER = 3;

/** Подбираем градиентную пару под цвет тира — чем глубже, тем темнее. */
function tierGradient(tier: AchievementItem['tier'], locked: boolean): [string, string] {
  if (locked) {
    return ['#E4E7EE', '#C9CDD6'];
  }
  const base = tier.color_hex;
  const lighter = lighten(base, 0.25);
  const darker = darken(base, 0.18);
  return [lighter, darker];
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return [r, g, b];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const pad = (n: number) => n.toString(16).padStart(2, '0');
  return `#${pad(Math.max(0, Math.min(255, Math.round(r))))}${pad(Math.max(0, Math.min(255, Math.round(g))))}${pad(Math.max(0, Math.min(255, Math.round(b))))}`;
}

function lighten(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t]);
}

function darken(hex: string, t: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex([r * (1 - t), g * (1 - t), b * (1 - t)]);
}

/** Достаём 1–2 «короны»-инициалы из icon_slug. */
function initialFromSlug(slug: string | null | undefined, code: string): string {
  const source = (slug || code).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return source.slice(0, 2) || '?';
}

export function AchievementPin({ item, size = 72, style }: Props) {
  const locked = !item.is_unlocked;
  const isMysterySecret = item.is_hidden && !item.is_unlocked;
  const [c1, c2] = tierGradient(item.tier, locked || isMysterySecret);
  const dim = size;
  const innerDim = dim - SIZE_BORDER * 2;
  const fontSize = Math.round(dim * SIZE_FONT_RATIO);
  const iconSize = Math.round(dim * SIZE_ICON_RATIO);

  return (
    <View style={[styles.wrap, { width: dim, height: dim }, style]}>
      {/* Внешняя кайма */}
      <LinearGradient
        colors={[lighten(c1, 0.15), darken(c2, 0.05)] as [string, string]}
        start={{ x: 0.1, y: 0.1 }}
        end={{ x: 0.9, y: 0.95 }}
        style={[styles.outer, { width: dim, height: dim, borderRadius: dim / 2 }]}
      >
        {/* Эмаль */}
        <LinearGradient
          colors={[c1, c2] as [string, string]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={[
            styles.inner,
            {
              width: innerDim,
              height: innerDim,
              borderRadius: innerDim / 2,
            },
          ]}
        >
          {isMysterySecret ? (
            <Ionicons name="help" size={iconSize} color="#7A7E8B" />
          ) : locked ? (
            <Ionicons name="lock-closed" size={iconSize * 0.75} color="#7A7E8B" />
          ) : (
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                {
                  fontSize,
                  // тёмный текст на светлом тире, белый на тёмном
                  color: item.tier.key === 'simple' || item.tier.key === 'rare' ? '#0E121C' : '#FFFFFF',
                },
              ]}
            >
              {initialFromSlug(item.icon_slug, item.code)}
            </Text>
          )}
        </LinearGradient>
      </LinearGradient>

      {/* Меточка «META» в углу */}
      {item.is_meta && (
        <View style={styles.metaBadge}>
          <Text style={styles.metaBadgeText}>★</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  metaBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFD66B',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaBadgeText: {
    fontSize: 12,
    color: '#7A4E00',
    fontWeight: '900',
    lineHeight: 13,
  },
});
