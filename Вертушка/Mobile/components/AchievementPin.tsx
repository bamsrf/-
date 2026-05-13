/**
 * AchievementPin — пин ачивки с сюжетной SVG-сценой.
 *
 * Структура:
 *   ┌────── рамка (квадрат, прозрачная) ──────┐
 *   │   ┌── aura (мягкий цветной halo) ──┐    │
 *   │   │     ┌── scene (сюжет) ──┐      │    │
 *   │   │     │     SVG illust    │      │    │
 *   │   │     └───────────────────┘      │    │
 *   │   └────────────────────────────────┘    │
 *   └─────────────────────────────────────────┘
 *
 * Форма пина = форма сюжета. Тир выражается через цветную ауру вокруг + лёгкий
 * градиент в самой сцене. Это позволяет пинам быть совершенно разными
 * визуально, не теряя визуальной иерархии редкости.
 *
 * Состояния:
 * - is_unlocked = true → яркая сцена + полная аура.
 * - is_unlocked = false + is_hidden = true → ❓-плашка (Сюрприз скрытый).
 * - is_unlocked = false + is_hidden = false → приглушённая сцена с замочком.
 * - progress / progress_target ≥ 0.75 → лёгкий пульс ауры (мотивация дожать).
 */
import { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  getSceneRenderer,
  SceneDefault,
  TIER_AURA,
} from './achievement-scenes';
import type { AchievementItem } from '../lib/types';

type PinSize = 56 | 72 | 96 | 140;

interface Props {
  item: AchievementItem;
  size?: PinSize;
  style?: StyleProp<ViewStyle>;
  /** Подсветить пин ауры при анлок-анимации (используется в overlay). */
  glowOverride?: boolean;
}

const NEAR_UNLOCK_THRESHOLD = 0.75;

function initialFromSlug(slug: string | null | undefined, code: string): string {
  const source = (slug || code).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return source.slice(0, 2) || '?';
}

export function AchievementPin({ item, size = 72, style, glowOverride = false }: Props) {
  const tierPalette = TIER_AURA[item.tier.key] || TIER_AURA.simple;
  const isMystery = item.is_hidden && !item.is_unlocked;
  const locked = !item.is_unlocked;
  const progressRatio =
    item.progress_target > 0 ? Math.min(1, item.progress / item.progress_target) : 0;
  const nearUnlock = locked && !isMystery && progressRatio >= NEAR_UNLOCK_THRESHOLD;
  const glow = glowOverride || nearUnlock || !locked;

  const pulse = useRef(new Animated.Value(0)).current;

  // «Почти получено» — пульсация ауры
  useEffect(() => {
    if (!nearUnlock) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [nearUnlock, pulse]);

  const auraScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const auraOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [glow ? 0.85 : 0.3, glow ? 1 : 0.45],
  });

  // Render scene или fallback
  const renderer = getSceneRenderer(item.code);
  const sceneProps = {
    size,
    accent: tierPalette.aura,
    accentDark: tierPalette.auraSoft,
    ink: '#0E121C',
    locked: locked && !isMystery,
  };

  let content;
  if (isMystery) {
    content = <MysteryPlaceholder size={size} />;
  } else if (renderer) {
    content = renderer(sceneProps);
  } else {
    content = (
      <SceneDefault
        {...sceneProps}
        label={initialFromSlug(item.icon_slug, item.code)}
      />
    );
  }

  return (
    <View
      style={[
        styles.wrap,
        { width: size, height: size },
        style,
      ]}
    >
      {/* Aura backdrop по тиру */}
      <Animated.View
        style={[
          styles.aura,
          {
            width: size * 1.15,
            height: size * 1.15,
            borderRadius: (size * 1.15) / 2,
            backgroundColor: tierPalette.auraSoft,
            opacity: auraOpacity,
            transform: [{ scale: auraScale }],
            shadowColor: tierPalette.aura,
          },
        ]}
      />

      {/* Inner glow (бликообразный) для open и для near-unlock */}
      {glow && (
        <View
          style={[
            styles.innerGlow,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: tierPalette.aura,
            },
          ]}
        />
      )}

      {/* Сама сцена */}
      <View
        style={{
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isMystery ? 1 : locked ? 0.55 : 1,
        }}
      >
        {content}
      </View>

      {/* Замочек для locked (но не для скрытых рандомных) */}
      {locked && !isMystery && (
        <View style={[styles.lockBadge, { width: size * 0.28, height: size * 0.28, borderRadius: size * 0.14 }]}>
          <Ionicons name="lock-closed" size={size * 0.16} color="#FFFFFF" />
        </View>
      )}

      {/* Метка META */}
      {item.is_meta && !isMystery && (
        <View
          style={[
            styles.metaBadge,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: (size * 0.28) / 2,
            },
          ]}
        >
          <Text style={styles.metaStar}>★</Text>
        </View>
      )}
    </View>
  );
}

function MysteryPlaceholder({ size }: { size: number }) {
  return (
    <View
      style={{
        width: size * 0.7,
        height: size * 0.7,
        borderRadius: (size * 0.7) / 2,
        backgroundColor: '#E4E7EE',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#C2C7D5',
        borderStyle: 'dashed',
      }}
    >
      <Ionicons name="help" size={size * 0.32} color="#7A7E8B" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  aura: {
    position: 'absolute',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
  },
  innerGlow: {
    position: 'absolute',
    opacity: 0.18,
  },
  lockBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#0E121C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  metaBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFD66B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  metaStar: {
    fontSize: 13,
    color: '#7A4E00',
    fontWeight: '900',
    lineHeight: 14,
  },
});
