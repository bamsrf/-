/**
 * MarketGesturePrompt — Instagram silent-messages-стиль приглашение
 * к переходу между Поиском и Маркетом.
 *
 * Состоит из:
 *   - Круговой индикатор прогресса (SVG circle с stroke-dashoffset).
 *     Заполняется по мере того как scrollY проходит transition-зону.
 *   - Текстовая подсказка снизу, кросс-фейдится:
 *       progress < 1  → «pending» копи (Скролль ещё немного)
 *       progress ≥ 1  → «armed»  копи (Отпусти, чтобы войти / выйти)
 *
 * Триггер действия — onScrollEndDrag в parent: если в момент отпускания
 * progress.value >= 1 → enterMarket()/exitMarket() с heavy haptic.
 *
 * НЕ обрабатывает события скролла сам, просто визуал. pointerEvents=none.
 *
 * Источник: Instagram chat «Swipe up to turn on disappearing messages».
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type GesturePromptMode = 'entry' | 'exit';

interface MarketGesturePromptProps {
  /** SharedValue 0..1+ — прогресс жеста. */
  progress: SharedValue<number>;
  /** SharedValue 0..1 — opacity всего блока (показываем только в зоне). */
  visibility: SharedValue<number>;
  /** Куда юзер идёт. Plain prop — меняется setState'ом в parent. */
  mode: GesturePromptMode;
  /** Позиция overlay'я на экране. Для entry — внизу, для exit — сверху. */
  position?: 'bottom' | 'top';
}

const CIRCLE_SIZE = 30;
const STROKE_WIDTH = 2.5;
const RADIUS = (CIRCLE_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const COPY: Record<GesturePromptMode, { pending: string; armed: string }> = {
  entry: {
    pending: 'Скролль ещё, чтобы открыть Маркет',
    armed: 'Отпусти — войдёшь в Маркет',
  },
  exit: {
    pending: 'Скролль вверх, чтобы вернуться в Поиск',
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

  // Cobalt arc (видим при low-progress)
  const cobaltArcProps = useAnimatedProps(() => {
    const p = Math.min(progress.value, 1);
    return {
      strokeDashoffset: CIRCUMFERENCE * (1 - p),
      opacity: 1 - p,
    };
  });
  // Ember arc (видим при high-progress)
  const emberArcProps = useAnimatedProps(() => {
    const p = Math.min(progress.value, 1);
    return {
      strokeDashoffset: CIRCUMFERENCE * (1 - p),
      opacity: p,
    };
  });

  // Cross-fade pending → armed на progress >= 0.85
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
      {/* SVG arc обёрнут в View с rotation: react-native-svg иногда падает
          на transform-attribute, особенно когда animatedProps обновляются
          часто. Поворачиваем сам View на -90deg чтобы дуга стартовала
          сверху (12 часов), а не справа (3 часа). */}
      <View style={styles.circleRotated}>
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE}>
          {/* Background track */}
          <Circle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke="rgba(255,255,255,0.22)"
            strokeWidth={STROKE_WIDTH}
            fill="none"
          />
          {/* Cobalt progress arc */}
          <AnimatedCircle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke="#5780F0"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCUMFERENCE}
            strokeLinecap="round"
            fill="none"
            animatedProps={cobaltArcProps}
          />
          {/* Ember progress arc */}
          <AnimatedCircle
            cx={CIRCLE_SIZE / 2}
            cy={CIRCLE_SIZE / 2}
            r={RADIUS}
            stroke="#FF7A4A"
            strokeWidth={STROKE_WIDTH}
            strokeDasharray={CIRCUMFERENCE}
            strokeLinecap="round"
            fill="none"
            animatedProps={emberArcProps}
          />
        </Svg>
      </View>

      <View style={styles.labelStack}>
        {/* ОБА текста абсолютные — иначе один занимает место в layout'е,
            а второй (absolute) накладывается. Юзер видел два налезающих
            друг на друга текста. */}
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
    bottom: 130, // выше floating tab-bar'а
  },
  containerTop: {
    top: 80, // под status bar
  },
  circleRotated: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    transform: [{ rotate: '-90deg' }],
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
    textShadowColor: 'rgba(0,0,0,0.50)',
    textShadowRadius: 10,
  },
  labelAbs: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 2,
    textAlign: 'center',
  },
  labelPending: {
    color: 'rgba(255,255,255,0.78)',
  },
  labelArmed: {
    color: '#FFD9C8',
    fontFamily: 'Inter_800ExtraBold',
    fontWeight: '800',
  },
});

export default MarketGesturePrompt;
