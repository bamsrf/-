/**
 * Sparkle — gold-блик-звёздочка (4-конечная) для подсветки пинов и трофеев.
 * Порт inline-SVG из MainScreen.jsx (Hero sparkle).
 */
import Svg, { Path } from 'react-native-svg';

import { M_GOLD_HI } from './palette';

interface Props {
  size?: number;
  color?: string;
}

export function Sparkle({ size = 14, color = M_GOLD_HI }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Path d="M7 0L8 6L14 7L8 8L7 14L6 8L0 7L6 6Z" fill={color} />
    </Svg>
  );
}
