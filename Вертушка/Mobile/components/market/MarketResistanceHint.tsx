/**
 * MarketResistanceHint — подсказка «Скролль вниз, чтобы открыть Маркет».
 *
 * Поведение (MARKET_AND_PRICE_DRAWER.md §1.3.5 «магия двери»):
 *   - Появляется когда юзер вошёл в RESIST_START_Y (≈220 px scrollY) и ещё
 *     не пересёк RESIST_END_Y (≈420 px) — то есть пользователь скроллит
 *     к Маркету, но ещё на «своей» стороне двери.
 *   - Плавно тинтует прозрачность 0 → 1 по ходу скролла + лёгкий translate
 *     вверх (типа «вытягивается из-под низа экрана»).
 *   - Каждые ~80 px scrollY в зоне резистанса трогаем impactAsync(Light) —
 *     ощущение, что приложение «сопротивляется» переходу. Без блокировки
 *     самого скролла: блокировка дёргает контент, а это убивает плавность.
 *
 * Render: absolute-positioned над контентом, прижат к нижней границе экрана
 * (где как раз появится gradient-header Маркета). Дальше exit-animation:
 * после RESIST_END_Y плавно исчезает (фон Маркета зажигается сам через
 * MarketBackground).
 *
 * Привязан к тому же scrollY SharedValue что и MarketBackground.
 *
 * Источник: пожелание юзера «как silent messages в инстаграме».
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { Icon } from '../ui/Icon';

/**
 * Зона «резистанса». Между RESIST_START_Y и RESIST_END_Y подсказка видна и
 * каждые HAPTIC_STEP_Y px скролла → пульсация. RESIST_END_Y должен быть равен
 * TRANSITION_START_Y из MarketBackground — подсказка пропадает ровно когда
 * начинается magic-transition.
 */
export const RESIST_START_Y = 240;
export const RESIST_END_Y = 400;
const HAPTIC_STEP_Y = 80;

interface MarketResistanceHintProps {
  scrollY: SharedValue<number>;
  /** Скрыть подсказку (например, юзер уже один раз перешёл в Маркет за сессию). */
  disabled?: boolean;
}

export function MarketResistanceHint({ scrollY, disabled }: MarketResistanceHintProps) {
  // Haptic «лесенкой»: каждый раз когда scrollY переходит через очередной
  // checkpoint в зоне резистанса — короткий toc. Сравниваем floor(y/STEP) с
  // предыдущим значением, и если оно увеличилось — triggerим.
  useEffect(() => {
    // useDerivedValue не пересоздаётся при rerender — ставим cleanup только
    // на анмаунт, иначе на каждый rerender теряется prev-checkpoint state.
    return () => {};
  }, []);

  useDerivedValue(() => {
    const y = scrollY.value;
    if (disabled) return;
    if (y < RESIST_START_Y || y > RESIST_END_Y) return;
    const step = Math.floor((y - RESIST_START_Y) / HAPTIC_STEP_Y);
    // _last хранится в самом worklet через свойство-маркер
    // (нельзя useRef внутри worklet'а, поэтому пишем на сам SharedValue
    // через прокси __resistanceStep — это плоское number-поле, реанимация
    // нормально это переваривает в JS-стиле).
    // @ts-expect-error: расширяем SharedValue ad-hoc для хранения last-step
    const last = scrollY.__resistanceStep ?? -1;
    if (step > last) {
      // @ts-expect-error: см. выше
      scrollY.__resistanceStep = step;
      runOnJS(triggerHaptic)();
    }
  }, [disabled]);

  const containerStyle = useAnimatedStyle(() => {
    if (disabled) return { opacity: 0 };
    // 0 → 1 за первые 60% зоны, 1 → 0 за последние 40% (исчезает плавно
    // когда фон Маркета уже зажигается).
    const peakY = RESIST_START_Y + (RESIST_END_Y - RESIST_START_Y) * 0.6;
    const opacity = interpolate(
      scrollY.value,
      [RESIST_START_Y - 20, RESIST_START_Y + 40, peakY, RESIST_END_Y],
      [0, 1, 1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [RESIST_START_Y, RESIST_END_Y],
      [16, -4],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  // Стрелка пульсирует — переход на «следующий уровень»
  const arrowStyle = useAnimatedStyle(() => {
    if (disabled) return { opacity: 0.6 };
    const intensity = interpolate(
      scrollY.value,
      [RESIST_START_Y, RESIST_END_Y],
      [0, 6],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY: intensity }],
      opacity: interpolate(
        scrollY.value,
        [RESIST_START_Y, RESIST_END_Y],
        [0.6, 1],
        Extrapolation.CLAMP,
      ),
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.container, containerStyle]}>
      <LinearGradient
        colors={['rgba(14, 7, 38, 0)', 'rgba(14, 7, 38, 0.55)', 'rgba(14, 7, 38, 0.85)']}
        locations={[0, 0.55, 1]}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <Animated.View style={arrowStyle}>
            <Icon name="chevron-down" size={22} color="onBrand" />
          </Animated.View>
          <Text style={styles.label}>
            Скролль вниз, чтобы открыть{' '}
            <Text style={styles.labelBrand}>Маркет</Text>
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // height ставим явный, чтобы внутренний LinearGradient знал куда тянуться
    height: 160,
    // pointerEvents=none снаружи — скролл проходит насквозь
  },
  gradient: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 18,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  content: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 0.2,
  },
  labelBrand: {
    fontFamily: 'Inter_700Bold',
    color: '#FFD9C8', // emberSoft — тот же оттенок что terminal-card в маркете
    fontWeight: '700',
  },
});

export default MarketResistanceHint;
