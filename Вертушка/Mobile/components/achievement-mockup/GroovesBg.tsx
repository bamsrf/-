/**
 * GroovesBg — концентрические круги-«канавки» как фирменный паттерн фона
 * navy-карточек. Порт из MainScreen.jsx GroovesBg. Радиусы привязаны к
 * сетке 44px (как в мокапе).
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { M_IVORY } from './palette';

interface Props {
  /** Прозрачность линий (на тёмном navy — 0.04..0.08). */
  opacity?: number;
  /** Центр канавок (x,y) в координатах SVG. */
  originX?: number;
  originY?: number;
  /** Кол-во колец. */
  rings?: number;
  /** Шаг между кольцами. */
  step?: number;
}

export function GroovesBg({
  opacity = 0.06,
  originX = 0,
  originY = 0,
  rings = 14,
  step = 44,
}: Props) {
  const circles = [];
  for (let i = 1; i <= rings; i++) {
    circles.push(
      <Circle
        key={i}
        cx={originX}
        cy={originY}
        r={i * step}
        fill="none"
        stroke={M_IVORY}
        strokeOpacity={opacity}
        strokeWidth={1}
      />,
    );
  }
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 350 600" preserveAspectRatio="xMidYMid slice">
        {circles}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
