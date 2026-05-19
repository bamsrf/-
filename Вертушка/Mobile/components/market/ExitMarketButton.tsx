/**
 * ExitMarketButton — floating «↑ Выйти из Маркета».
 *
 * Появляется когда юзер скроллит глубоко (scrollY > 1200, после первой
 * витрины магазина). Тап → scrollTo({y:0, animated:true}) на родительском
 * ScrollView → фон автоматически возвращается через MarketBackground
 * интерполяцию + sticky-state сбрасывается.
 *
 * Анимация появления: opacity 0→1 + translateY 12→0 за 240ms.
 *
 * Источник: docs/plans/MARKET_AND_PRICE_DRAWER.md §1.5 + screens-market.jsx
 * (ExitMarketBtn атом).
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';

import { Icon } from '../ui/Icon';
import { MarketPalette } from '../../constants/theme';

interface ExitMarketButtonProps {
  /** Виден ли кнопка прямо сейчас (управляется родителем через scrollY threshold). */
  visible: boolean;
  /** Callback на tap. Обычно scrollRef.current?.scrollTo({y:0, animated:true}). */
  onPress: () => void;
  /** Bottom-offset в pt от низа экрана (учитывает tab bar). Default 96. */
  bottom?: number;
  style?: StyleProp<ViewStyle>;
}

export function ExitMarketButton({
  visible,
  onPress,
  bottom = 96,
  style,
}: ExitMarketButtonProps) {
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [visible, progress]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 12 }],
  }));

  // pointerEvents=none когда невидим, чтобы не перехватывать тапы
  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.container,
        { bottom },
        animStyle,
        style,
      ]}
    >
      <Pressable
        onPress={onPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Выйти из Маркета, вернуться к поиску Discogs"
      >
        <BlurView intensity={32} tint="dark" style={styles.pill}>
          <Icon name="arrow-up" size={14} color="onBrand" />
          <Text style={styles.label}>Выйти из Маркета</Text>
        </BlurView>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    zIndex: 60,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.30,
    shadowRadius: 24,
    elevation: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MarketPalette.chrome.border,
    backgroundColor: 'rgba(11,20,56,0.55)',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    fontWeight: '600',
    color: MarketPalette.chrome.textPrimary,
    includeFontPadding: false,
  },
});

export default ExitMarketButton;
