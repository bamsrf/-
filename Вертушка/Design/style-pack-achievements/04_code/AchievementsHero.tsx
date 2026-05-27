/**
 * AchievementsHero — крупный блок в шапке экрана /achievements.
 *
 * Содержит:
 * - Анимированный counter «X / Y открыто» (число «вырастает» при загрузке)
 * - Архетип юзера (chip)
 * - Самая редкая открытая ачивка (большой пин справа)
 *
 * Если ачивок ещё нет — мотивирующее empty-state.
 */
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { AchievementPin } from './AchievementPin';
import { TIER_AURA } from './achievement-scenes';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { rarestUnlocked } from '../lib/achievementHelpers';
import { computeArchetype } from '../lib/archetype';
import type { AchievementItem, MyAchievementsResponse } from '../lib/types';

interface Props {
  data: MyAchievementsResponse;
  extraRandom?: AchievementItem[];
  username?: string | null;
}

export function AchievementsHero({ data, extraRandom = [], username }: Props) {
  const rarest = rarestUnlocked(data, extraRandom);
  const archetype = computeArchetype(data);

  // Анимированный counter
  const animatedCount = useRef(new Animated.Value(0)).current;
  const [displayCount, setDisplayCount] = useState(0);

  useEffect(() => {
    animatedCount.setValue(0);
    const listener = animatedCount.addListener(({ value }) => {
      setDisplayCount(Math.round(value));
    });
    Animated.timing(animatedCount, {
      toValue: data.unlocked,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animatedCount.removeListener(listener);
  }, [data.unlocked, animatedCount]);

  // Цвет фона hero — производный от тира самой редкой
  const auraKey = rarest?.tier.key || 'simple';
  const aura = TIER_AURA[auraKey];

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[aura.auraSoft, aura.aura] as [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.left}>
          <Text style={[styles.eyebrow, { color: aura.ink === '#FFFFFF' ? 'rgba(255,255,255,0.8)' : 'rgba(14,18,28,0.7)' }]}>
            {username ? `@${username}` : 'Твоя коллекция'}
          </Text>
          <View style={styles.counterRow}>
            <Text style={[styles.countBig, { color: aura.ink }]}>{displayCount}</Text>
            <Text style={[styles.countSlash, { color: aura.ink }]}>/{data.total}</Text>
          </View>
          <Text style={[styles.subtitle, { color: aura.ink === '#FFFFFF' ? 'rgba(255,255,255,0.85)' : 'rgba(14,18,28,0.65)' }]}>
            ачивок открыто
          </Text>
          {archetype && (
            <View
              style={[
                styles.archChip,
                {
                  borderColor: aura.ink === '#FFFFFF' ? 'rgba(255,255,255,0.35)' : 'rgba(14,18,28,0.2)',
                  backgroundColor: aura.ink === '#FFFFFF' ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.7)',
                },
              ]}
            >
              <Text style={[styles.archChipLabel, { color: aura.ink }]}>
                {archetype.label}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.right}>
          {rarest ? (
            <View style={styles.rarestWrap}>
              <Text style={[styles.rarestEyebrow, { color: aura.ink === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(14,18,28,0.55)' }]}>
                Твой топ
              </Text>
              <AchievementPin item={rarest} size={96} />
              <Text numberOfLines={1} style={[styles.rarestLabel, { color: aura.ink }]}>
                {rarest.title_ru || '?'}
              </Text>
            </View>
          ) : (
            <View style={styles.rarestEmpty}>
              <Text style={[styles.rarestEmptyText, { color: aura.ink === '#FFFFFF' ? 'rgba(255,255,255,0.7)' : 'rgba(14,18,28,0.6)' }]}>
                Открой первую — здесь появится твоя самая редкая.
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  gradient: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    minHeight: 156,
  },
  left: {
    flex: 1,
    justifyContent: 'center',
  },
  right: {
    width: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  countBig: {
    fontSize: 56,
    fontWeight: '800',
    letterSpacing: -1,
    lineHeight: 60,
  },
  countSlash: {
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 4,
    opacity: 0.8,
  },
  subtitle: {
    fontSize: 13,
    marginTop: -2,
    marginBottom: 8,
  },
  archChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  archChipLabel: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  rarestWrap: {
    alignItems: 'center',
  },
  rarestEyebrow: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  rarestLabel: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
    textAlign: 'center',
  },
  rarestEmpty: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  rarestEmptyText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

// Suppress unused colors imports if any
const _kept = { Colors };
void _kept;
