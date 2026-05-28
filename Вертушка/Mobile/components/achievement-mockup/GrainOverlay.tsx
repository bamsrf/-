/**
 * GrainOverlay — фрактал-шум поверх navy-блоков, как в мокапе (4-7% opacity).
 * Реализовано через react-native-svg <Filter> с <FeTurbulence>+<FeColorMatrix>.
 */
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, FeColorMatrix, FeTurbulence, Filter, Rect } from 'react-native-svg';

interface Props {
  opacity?: number;
}

export function GrainOverlay({ opacity = 0.06 }: Props) {
  return (
    <View style={[styles.wrap, { opacity }]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <Filter id="grain">
            <FeTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} stitchTiles="stitch" />
            <FeColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0" />
          </Filter>
        </Defs>
        <Rect width="100%" height="100%" filter="url(#grain)" />
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
