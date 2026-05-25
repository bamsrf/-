/**
 * MarketCurtain — визуальный занавес между Поиском и Маркетом.
 *
 * Чисто визуальный компонент. Жест и решение о commit'е принимает parent
 * через scroll overdrag (см. (tabs)/search.tsx и /market/index.tsx) — так
 * естественнее: юзер скроллит до края, продолжает тянуть, контент рубер-
 * бэндит, и при достижении порога мы коммитим в навигацию.
 *
 * Рендерим градиент-плёнку, растущую от соответствующего края экрана
 * пропорционально `progress` (0..1):
 *   • mode='search' — тёмная плёнка растёт снизу-вверх (мир Маркета
 *     интрудит в Поиск).
 *   • mode='market' — светлая плёнка растёт сверху-вниз (Поиск
 *     возвращается в Маркет).
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

export type CurtainMode = 'search' | 'market';

interface MarketCurtainProps {
  mode: CurtainMode;
  /** 0..1: parent рассчитывает из overdrag'а и snap'а. */
  progress: SharedValue<number>;
}

export function MarketCurtain({ mode, progress }: MarketCurtainProps) {
  const veilStyle = useAnimatedStyle(() => {
    const p = Math.min(1, progress.value);
    return {
      opacity: interpolate(p, [0, 0.2, 1], [0, 0.55, 1], Extrapolation.CLAMP),
    };
  });

  const veilGradientStyle = useAnimatedStyle(() => {
    const p = Math.min(1, progress.value);
    return {
      transform: [
        { scaleY: interpolate(p, [0, 1], [0.18, 1], Extrapolation.CLAMP) },
      ],
      transformOrigin: mode === 'search' ? 'bottom' : 'top',
    } as any;
  });

  // Цвета занавеса:
  //   • search → market: вторгается мир Маркета (тёмный).
  //   • market → search: вторгается мир Поиска (светлый).
  const colors =
    mode === 'search'
      ? (['rgba(14,7,38,0)', 'rgba(14,7,38,0.55)', 'rgba(14,7,38,0.92)'] as const)
      : (['rgba(250,251,255,0.92)', 'rgba(250,251,255,0.60)', 'rgba(250,251,255,0)'] as const);

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, styles.veilWrap, veilStyle]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, veilGradientStyle]}>
        <LinearGradient
          colors={colors as unknown as readonly [string, string, ...string[]]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  veilWrap: {
    overflow: 'hidden',
    zIndex: 50,
  },
});

export default MarketCurtain;
