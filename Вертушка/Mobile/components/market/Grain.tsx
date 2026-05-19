/**
 * Grain — процедурный шум для фона Маркета.
 *
 * SVG `feTurbulence` (fractalNoise) + feColorMatrix для контрастирования
 * до почти-binary шума, поверх — `mixBlendMode="overlay"` opacity 0.16.
 * Даёт «органическое», не-плоское ощущение market-фона.
 *
 * Перформанс: renders once on mount, не анимируется. Pointer-events off.
 *
 * Источник: market-bg.jsx из Design Claude handoff (`Grain` атом).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  Filter,
  FeTurbulence,
  FeColorMatrix,
  Rect,
} from 'react-native-svg';

interface GrainProps {
  opacity?: number; // default 0.16 — еле заметный, не визуальный мусор
  seed?: number;    // default 7 — детерминированный для одинаковости между mount'ами
}

export const Grain = React.memo(function Grain({
  opacity = 0.16,
  seed = 7,
}: GrainProps) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Filter id="market-grain" x="0" y="0" width="100%" height="100%">
            <FeTurbulence
              type="fractalNoise"
              baseFrequency="1.6"
              numOctaves={2}
              seed={seed}
              stitchTiles="stitch"
            />
            <FeColorMatrix
              type="matrix"
              values="0 0 0 0 1   0 0 0 0 1   0 0 0 0 1   0 0 0 1.4 -0.2"
            />
          </Filter>
        </Defs>
        <Rect width="100%" height="100%" fill="black" filter="url(#market-grain)" />
      </Svg>
    </View>
  );
});

export default Grain;
