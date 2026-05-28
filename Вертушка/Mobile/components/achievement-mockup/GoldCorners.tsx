/**
 * GoldCorners — 4 уголка по краям hero-блока (декорация в стиле сертификата).
 * Каждый угол — двойная gold-линия с opacity 0.35.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { M_GOLD_HI } from './palette';

interface Props {
  inset?: number;
  size?: number;
  opacity?: number;
}

function Corner({ rotate = 0, top, left, right, bottom, size, opacity }: {
  rotate?: number;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  size: number;
  opacity: number;
}) {
  return (
    <View
      style={[
        styles.corner,
        { top, left, right, bottom, width: size, height: size, opacity, transform: [{ rotate: `${rotate}deg` }] },
      ]}
      pointerEvents="none"
    >
      <Svg width={size} height={size} viewBox="0 0 38 38">
        <Path d="M2 12V6a4 4 0 0 1 4-4h6" stroke={M_GOLD_HI} strokeWidth={1.2} fill="none" />
        <Path d="M5 12V8a3 3 0 0 1 3-3h4" stroke={M_GOLD_HI} strokeWidth={1.2} fill="none" strokeOpacity={0.6} />
      </Svg>
    </View>
  );
}

export function GoldCorners({ inset = 10, size = 32, opacity = 0.35 }: Props) {
  return (
    <>
      <Corner top={inset} left={inset} size={size} opacity={opacity} rotate={0} />
      <Corner top={inset} right={inset} size={size} opacity={opacity} rotate={90} />
      <Corner bottom={inset} right={inset} size={size} opacity={opacity} rotate={180} />
      <Corner bottom={inset} left={inset} size={size} opacity={opacity} rotate={270} />
    </>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
  },
});
