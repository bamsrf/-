/**
 * MarketGesturePrompt — silent-messages-стиль приглашение перехода.
 *
 * Версия 2 (после crash'а): SVG circle убран — react-native-svg падал
 * при частых обновлениях animatedProps. Теперь чистые RN View'ы.
 *
 * Структура:
 *   - Тонкая горизонтальная progress-bar 120dp (cobalt → ember interpolated)
 *   - Текст под ней, кросс-фейд pending → armed на progress > 0.7.
 *
 * Триггер живёт в parent onScrollEndDrag worklet.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

export type GesturePromptMode = 'entry' | 'exit';

interface MarketGesturePromptProps {
  progress: SharedValue<number>;
  visibility: SharedValue<number>;
  mode: GesturePromptMode;
  position?: 'bottom' | 'top';
}

const BAR_WIDTH = 140;
const BAR_HEIGHT = 4;

const COPY: Record<GesturePromptMode, { pending: string; armed: string }> = {
  entry: {
    pending: 'Скролль, чтобы открыть Маркет',
    armed: 'Отпусти — войдёшь в Маркет',
  },
  exit: {
    pending: 'Скролль, чтобы вернуться в Поиск',
    armed: 'Отпусти — вернёшься в Поиск',
  },
};

export function MarketGesturePrompt({
  progress,
  visibility,
  mode,
  position = 'bottom',
}: MarketGesturePromptProps) {
  const containerStyle = useAnimatedStyle(() => ({
    opacity: visibility.value,
    transform: [
      {
        translateY: interpolate(
          visibility.value,
          [0, 1],
          [position === 'top' ? -12 : 12, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Progress-bar fill — width interpolated, color cobalt → ember
  const barFillStyle = useAnimatedStyle(() => {
    const p = Math.min(Math.max(progress.value, 0), 1);
    return {
      width: BAR_WIDTH * p,
      backgroundColor: interpolateColor(
        p,
        [0, 0.5, 1],
        ['#5780F0', '#9B6CF0', '#FF7A4A'],
      ),
    };
  });

  const pendingLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.7, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const armedLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.7, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const copy = COPY[mode];

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        position === 'top' ? styles.containerTop : styles.containerBottom,
        containerStyle,
      ]}
    >
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barFillStyle]} />
      </View>

      <View style={styles.labelStack}>
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, styles.labelPending, styles.labelAbs, pendingLabelStyle]}
        >
          {copy.pending}
        </Animated.Text>
        <Animated.Text
          numberOfLines={1}
          style={[styles.label, styles.labelArmed, styles.labelAbs, armedLabelStyle]}
        >
          {copy.armed}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
    zIndex: 55,
    paddingHorizontal: 24,
  },
  containerBottom: {
    bottom: 130,
  },
  containerTop: {
    top: 80,
  },
  barTrack: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BAR_HEIGHT / 2,
  },
  labelStack: {
    position: 'relative',
    height: 22,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
    letterSpacing: 0.1,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowRadius: 12,
  },
  labelAbs: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 2,
    textAlign: 'center',
  },
  labelPending: {
    color: 'rgba(255,255,255,0.82)',
  },
  labelArmed: {
    color: '#FFD9C8',
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
  },
});

export default MarketGesturePrompt;
