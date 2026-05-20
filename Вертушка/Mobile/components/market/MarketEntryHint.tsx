/**
 * MarketEntryHint — silent-messages-стиль предупреждение перехода в Маркет.
 *
 * Показывается ОДИН раз после 1-го пересечения порога (speed-bump).
 * Текст копирайтерский: «↓ Ещё раз вниз — войдёшь в Маркет».
 *
 * Управляется через prop `visible` (true → fade-in за 200ms, false → fade-out).
 * После 2-го пересечения родитель закрывает + срабатывает auto-scroll в Маркет.
 *
 * Визуал: gradient-капсула в центре нижней половины экрана. Тёмный фон,
 * белый текст, ember-стрелка вниз. Подсказка ощущается как «дверь приоткрыта,
 * нажми ещё раз».
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon } from '../ui';

interface MarketEntryHintProps {
  visible: boolean;
}

export function MarketEntryHint({ visible }: MarketEntryHintProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) });
    } else {
      opacity.value = withTiming(0, { duration: 160, easing: Easing.in(Easing.cubic) });
      translateY.value = withTiming(20, { duration: 160 });
    }
  }, [visible, opacity, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, animStyle]}
    >
      <LinearGradient
        colors={['rgba(14,7,38,0.95)', 'rgba(36,15,68,0.95)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pill}
      >
        <Icon name="chevron-down" size={16} color="accent" />
        <Text style={styles.label}>
          Ещё раз вниз — войдёшь в{' '}
          <Text style={styles.labelBrand}>Маркет</Text>
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: 'center',
    zIndex: 60,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 9999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,217,200,0.35)',
    // Glow ember
    shadowColor: '#FF7A4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: 'rgba(255,255,255,0.92)',
    letterSpacing: 0.1,
  },
  labelBrand: {
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
    color: '#FFD9C8',
  },
});

export default MarketEntryHint;
