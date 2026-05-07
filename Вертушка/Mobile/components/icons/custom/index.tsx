/**
 * Custom SVG icons — Polish Vertushka v4 (final pack).
 *
 * Порт `b4-icons.jsx` из Claude Design на react-native-svg. 9 иконок
 * (Disc исключён — оставляем текущую Phosphor `VinylRecordIcon` через
 * components/icons/hero/DiscGrooves), каждая со своей композицией.
 *
 * Контракт под `<Icon>` wrapper:
 *   - props: { size, color, weight, hitSlop, testID, style }
 *   - weight: 'fill' = чистый silhouette (без halo, без деталей).
 *             'regular' | 'duotone' = silhouette + halo + glass-overlay/детали.
 *
 * Halo реализован layered fallback'ом (3 концентрических scale-слоя) чтобы
 * стабильно рендерилось на iOS и Android без feGaussianBlur (под малые
 * размеры в tab bar этот approach даёт более предсказуемый результат).
 */
import React from 'react';
import {
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

const EMBER = '#E85A2A';
const WHITE = '#FFFFFF';

// ───────────────────────────────────────────────────────────────────────────
// Public props — совместимы с Phosphor Icon API в части size/color/weight.
// ───────────────────────────────────────────────────────────────────────────

export interface CustomIconProps {
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' | string;
  hitSlop?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  mirrored?: boolean;
}

const DEFAULT_COLOR = '#2A4BD7'; // brand.cobalt light

// ───────────────────────────────────────────────────────────────────────────
// Halo helper
//
// Halo по дизайн-системе Polish Vertushka v4 рендерится единообразно для
// ВСЕХ иконок в `components/ui/Icon.tsx` (через iOS shadow + scaled backdrop
// слой). Поэтому здесь — no-op: внутренний halo не нужен, иначе получим
// двойную ауру на custom-иконках больших размеров.
// ───────────────────────────────────────────────────────────────────────────

interface HaloProps {
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  scale?: number;
  opacity?: number;
  color: string;
}

const Halo: React.FC<HaloProps> = () => null;

// ───────────────────────────────────────────────────────────────────────────
// Wrapper — обёртка вокруг <Svg>, обрабатывает size/hitSlop/style.
// ───────────────────────────────────────────────────────────────────────────

interface CanvasProps {
  size: number;
  hitSlop?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const Canvas: React.FC<CanvasProps> = ({ size, hitSlop, testID, style, children }) => {
  const inner = (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={testID}>
      {children}
    </Svg>
  );
  if (hitSlop && hitSlop > 0) {
    return (
      <View
        style={[
          { width: size, height: size, alignItems: 'center', justifyContent: 'center' },
          style,
        ]}
        hitSlop={{ top: hitSlop, bottom: hitSlop, left: hitSlop, right: hitSlop }}
      >
        {inner}
      </View>
    );
  }
  return <View style={style}>{inner}</View>;
};

// ═══════════════════════════════════════════════════════════════════════════
// 1. MAGNIFYING-GLASS — tab bar "Поиск"
// ═══════════════════════════════════════════════════════════════════════════

export const MagnifyingGlassCustom: React.FC<CustomIconProps> = ({
  size = 24,
  color = DEFAULT_COLOR,
  weight = 'regular',
  hitSlop,
  testID,
  style,
}) => {
  const isFill = weight === 'fill';
  const isDuo = weight === 'duotone';
  const cx = 108;
  const cy = 108;
  const outerR = 80;
  const innerR = 62;

  return (
    <Canvas size={size} hitSlop={hitSlop} testID={testID} style={style}>
      {!isFill && size >= 32 ? (
        <Halo
          cx={cx}
          cy={cy}
          r={outerR}
          scale={1.22}
          opacity={isDuo ? 0.5 : 0.32}
          color={color}
        />
      ) : null}
      <Circle cx={cx} cy={cy} r={outerR} fill={color} />
      {!isFill ? (
        <Circle cx={cx} cy={cy} r={innerR} fill={WHITE} opacity={isDuo ? 0.35 : 0.26} />
      ) : null}
      <Line
        x1={170}
        y1={170}
        x2={222}
        y2={222}
        stroke={color}
        strokeWidth={28}
        strokeLinecap="round"
      />
      {isFill ? (
        <Circle cx={cx} cy={cy} r={innerR - 8} fill={WHITE} opacity={0.12} />
      ) : null}
      {isDuo ? (
        <Circle
          cx={cx}
          cy={cy}
          r={outerR - 10}
          fill="none"
          stroke={EMBER}
          strokeWidth={6}
          opacity={0.55}
        />
      ) : null}
    </Canvas>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 2. SCAN — tab bar "Сканер": 4 Γ-скобки + горизонтальная линия
// ═══════════════════════════════════════════════════════════════════════════

export const ScanCustom: React.FC<CustomIconProps> = ({
  size = 24,
  color = DEFAULT_COLOR,
  weight = 'regular',
  hitSlop,
  testID,
  style,
}) => {
  const isFill = weight === 'fill';
  const isDuo = weight === 'duotone';
  const m = 28;
  const br = 52;
  const sw = 18;
  const r = 14;
  const N = 256;

  const BK =
    `M ${m + br} ${m} L ${m + r} ${m} Q ${m} ${m} ${m} ${m + r} L ${m} ${m + br} ` +
    `M ${N - m - br} ${m} L ${N - m - r} ${m} Q ${N - m} ${m} ${N - m} ${m + r} L ${N - m} ${m + br} ` +
    `M ${N - m} ${N - m - br} L ${N - m} ${N - m - r} Q ${N - m} ${N - m} ${N - m - r} ${N - m} L ${N - m - br} ${N - m} ` +
    `M ${m} ${N - m - br} L ${m} ${N - m - r} Q ${m} ${N - m} ${m + r} ${N - m} L ${m + br} ${N - m}`;

  return (
    <Canvas size={size} hitSlop={hitSlop} testID={testID} style={style}>
      {!isFill && size >= 32 ? (
        <G opacity={isDuo ? 0.4 : 0.25}>
          <Path
            d={BK}
            fill="none"
            stroke={color}
            strokeWidth={sw + 8}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line
            x1={m + 10}
            y1={128}
            x2={N - m - 10}
            y2={128}
            stroke={color}
            strokeWidth={sw + 8}
            strokeLinecap="round"
          />
        </G>
      ) : null}
      <Path
        d={BK}
        fill="none"
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line
        x1={m + 10}
        y1={128}
        x2={N - m - 10}
        y2={128}
        stroke={color}
        strokeWidth={sw}
        strokeLinecap="round"
      />
    </Canvas>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. HEART — округлое filled сердечко (вишлист)
// ═══════════════════════════════════════════════════════════════════════════

const HEART_D = `
  M 128 215
  C 108 200 36 158 28 104
  C 22 68 48 36 84 36
  C 104 36 120 48 128 64
  C 136 48 152 36 172 36
  C 208 36 234 68 228 104
  C 220 158 148 200 128 215 Z
`;

export const HeartCustom: React.FC<CustomIconProps> = ({
  size = 24,
  color = DEFAULT_COLOR,
  weight = 'regular',
  hitSlop,
  testID,
  style,
}) => {
  const isFill = weight === 'fill';
  const isDuo = weight === 'duotone';

  return (
    <Canvas size={size} hitSlop={hitSlop} testID={testID} style={style}>
      {!isFill && size >= 32 ? (
        <Halo
          d={HEART_D}
          scale={1.18}
          opacity={isDuo ? 0.5 : 0.32}
          color={color}
        />
      ) : null}
      <Path d={HEART_D} fill={color} />
      {!isFill ? (
        <Path
          d="M 68 80 A 52 52 0 0 1 100 54"
          fill="none"
          stroke={WHITE}
          strokeWidth={7}
          strokeLinecap="round"
          opacity={isDuo ? 0.55 : 0.4}
        />
      ) : null}
    </Canvas>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 4. FOLDER — back-folder + front file-card glass overlay
// ═══════════════════════════════════════════════════════════════════════════

const FOLDER_BODY_D =
  'M 22 76 h 212 a 14 14 0 0 1 14 14 v 128 a 14 14 0 0 1 -14 14 h -212 a 14 14 0 0 1 -14 -14 v -128 a 14 14 0 0 1 14 -14 Z';
const FOLDER_TAB_D =
  'M 22 60 h 76 a 14 14 0 0 1 14 14 v 16 h -104 v -16 a 14 14 0 0 1 14 -14 Z';
const FOLDER_FILE_D =
  'M 78 98 h 112 a 14 14 0 0 1 14 14 v 100 a 14 14 0 0 1 -14 14 h -112 a 14 14 0 0 1 -14 -14 v -100 a 14 14 0 0 1 14 -14 Z';
const FOLDER_FOLD_D = 'M 168 98 v 22 a 8 8 0 0 0 8 8 h 18';

export const FolderCustom: React.FC<CustomIconProps> = ({
  size = 24,
  color = DEFAULT_COLOR,
  weight = 'regular',
  hitSlop,
  testID,
  style,
}) => {
  const isFill = weight === 'fill';
  const isDuo = weight === 'duotone';

  return (
    <Canvas size={size} hitSlop={hitSlop} testID={testID} style={style}>
      {!isFill && size >= 32 ? (
        <Halo
          d={FOLDER_BODY_D}
          scale={1.14}
          opacity={isDuo ? 0.48 : 0.3}
          color={color}
        />
      ) : null}
      <Path d={FOLDER_TAB_D} fill={color} />
      <Path d={FOLDER_BODY_D} fill={color} />
      {!isFill ? (
        <G>
          <G transform="translate(4 4)">
            <Path d={FOLDER_FILE_D} fill={color} opacity={0.45} />
          </G>
          <Path d={FOLDER_FILE_D} fill={WHITE} opacity={isDuo ? 0.68 : 0.58} />
          <Path d={FOLDER_FOLD_D} fill="none" stroke={color} strokeWidth={3} opacity={0.5} />
          <Line x1={96} y1={148} x2={174} y2={148} stroke={color} strokeWidth={5} strokeLinecap="round" opacity={0.28} />
          <Line x1={96} y1={164} x2={158} y2={164} stroke={color} strokeWidth={5} strokeLinecap="round" opacity={0.28} />
        </G>
      ) : null}
      {isDuo ? <Path d={FOLDER_TAB_D} fill={EMBER} opacity={0.65} /> : null}
    </Canvas>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 5. CALENDAR — body + 2 ring-loops + крупный «31»
// ═══════════════════════════════════════════════════════════════════════════

const CAL_BODY_D =
  'M 28 58 h 200 a 18 18 0 0 1 18 18 v 148 a 18 18 0 0 1 -18 18 h -200 a 18 18 0 0 1 -18 -18 v -148 a 18 18 0 0 1 18 -18 Z';

export const CalendarCustom: React.FC<CustomIconProps> = ({
  size = 24,
  color = DEFAULT_COLOR,
  weight = 'regular',
  hitSlop,
  testID,
  style,
}) => {
  const isFill = weight === 'fill';
  const isDuo = weight === 'duotone';

  return (
    <Canvas size={size} hitSlop={hitSlop} testID={testID} style={style}>
      {!isFill && size >= 32 ? (
        <Halo
          d={CAL_BODY_D}
          scale={1.16}
          opacity={isDuo ? 0.5 : 0.32}
          color={color}
        />
      ) : null}
      <Path d={CAL_BODY_D} fill={color} />
      {!isFill ? <Path d={CAL_BODY_D} fill={WHITE} opacity={0.07} /> : null}
      {!isFill ? (
        <Line x1={28} y1={98} x2={228} y2={98} stroke={WHITE} strokeWidth={4} opacity={isDuo ? 0.45 : 0.28} />
      ) : null}
      <Path d="M 78 36 v 42" stroke={color} strokeWidth={14} strokeLinecap="round" fill="none" />
      <Path d="M 178 36 v 42" stroke={color} strokeWidth={14} strokeLinecap="round" fill="none" />
      {!isFill && size >= 32 ? (
        <SvgText
          x={128}
          y={202}
          textAnchor="middle"
          fontFamily="Inter"
          fontWeight="900"
          fontSize={92}
          fill={WHITE}
        >
          31
        </SvgText>
      ) : null}
    </Canvas>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 6. BELL — silhouette + clapper arc
// ═══════════════════════════════════════════════════════════════════════════

const BELL_D = `
  M 128 24
  C 84 24 52 58 52 104
  L 52 148
  C 52 162 44 172 32 182
  C 22 190 28 204 44 204
  L 212 204
  C 228 204 234 190 224 182
  C 212 172 204 162 204 148
  L 204 104
  C 204 58 172 24 128 24 Z
`;
const BELL_CLAPPER_D = 'M 108 214 a 20 20 0 0 0 40 0 Z';

export const BellCustom: React.FC<CustomIconProps> = ({
  size = 24,
  color = DEFAULT_COLOR,
  weight = 'regular',
  hitSlop,
  testID,
  style,
}) => {
  const isFill = weight === 'fill';
  const isDuo = weight === 'duotone';

  return (
    <Canvas size={size} hitSlop={hitSlop} testID={testID} style={style}>
      {!isFill && size >= 32 ? (
        <Halo
          d={BELL_D}
          scale={1.16}
          opacity={isDuo ? 0.5 : 0.32}
          color={color}
        />
      ) : null}
      <Path d={BELL_D} fill={color} />
      <Path d={BELL_CLAPPER_D} fill={color} />
    </Canvas>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 7. GIFT — box + lid + bow + vertical ribbon
// ═══════════════════════════════════════════════════════════════════════════

const GIFT_BOX_D =
  'M 28 112 h 200 a 14 14 0 0 1 14 14 v 96 a 14 14 0 0 1 -14 14 h -200 a 14 14 0 0 1 -14 -14 v -96 a 14 14 0 0 1 14 -14 Z';
const GIFT_LID_D =
  'M 18 92 h 220 a 12 12 0 0 1 12 12 v 14 a 6 6 0 0 1 -6 6 h -232 a 6 6 0 0 1 -6 -6 v -14 a 12 12 0 0 1 12 -12 Z';
const GIFT_BOW_L =
  'M 128 84 C 128 60 96 48 90 66 C 86 78 104 88 128 84 Z';
const GIFT_BOW_R =
  'M 128 84 C 128 60 160 48 166 66 C 170 78 152 88 128 84 Z';

export const GiftCustom: React.FC<CustomIconProps> = ({
  size = 24,
  color = DEFAULT_COLOR,
  weight = 'regular',
  hitSlop,
  testID,
  style,
}) => {
  const isFill = weight === 'fill';
  const isDuo = weight === 'duotone';
  const COMP = `${GIFT_BOX_D} ${GIFT_LID_D} ${GIFT_BOW_L} ${GIFT_BOW_R}`;

  return (
    <Canvas size={size} hitSlop={hitSlop} testID={testID} style={style}>
      {!isFill && size >= 32 ? (
        <Halo
          d={COMP}
          scale={1.14}
          opacity={isDuo ? 0.48 : 0.3}
          color={color}
        />
      ) : null}
      <Path d={GIFT_BOX_D} fill={color} />
      <Path d={GIFT_LID_D} fill={color} />
      <Path d={GIFT_BOW_L} fill={color} />
      <Path d={GIFT_BOW_R} fill={color} />
      {!isFill ? (
        <Rect x={118} y={92} width={20} height={144} fill={WHITE} opacity={isDuo ? 0.9 : 0.82} />
      ) : null}
      {!isFill ? <Circle cx={128} cy={86} r={12} fill={WHITE} opacity={0.95} /> : null}
    </Canvas>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 8. CURRENCY (стопка из трёх монет, без символа валюты)
// ═══════════════════════════════════════════════════════════════════════════

export const CurrencyStack: React.FC<CustomIconProps> = ({
  size = 24,
  color = DEFAULT_COLOR,
  weight = 'regular',
  hitSlop,
  testID,
  style,
}) => {
  const isFill = weight === 'fill';
  const isDuo = weight === 'duotone';
  const RX = 88;
  const RY = 22;
  const GAP = 44;
  const CX = 128;
  const C1Y = 196;
  const C2Y = C1Y - GAP;
  const C3Y = C2Y - GAP;
  const edgeH = 12;
  const sw = 13;

  return (
    <Canvas size={size} hitSlop={hitSlop} testID={testID} style={style}>
      {!isFill && size >= 32 ? (
        <Halo
          cx={CX}
          cy={C3Y}
          r={RX}
          scale={1.22}
          opacity={isDuo ? 0.5 : 0.28}
          color={color}
        />
      ) : null}

      {/* Bottom coin (c1) */}
      {isFill ? (
        <Rect x={CX - RX} y={C1Y} width={RX * 2} height={edgeH} fill={color} opacity={0.55} />
      ) : (
        <G>
          <Rect x={CX - RX + sw / 2} y={C1Y} width={RX * 2 - sw} height={edgeH} fill={color} opacity={0.3} />
          <Line x1={CX - RX} y1={C1Y} x2={CX - RX} y2={C1Y + edgeH} stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1={CX + RX} y1={C1Y} x2={CX + RX} y2={C1Y + edgeH} stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </G>
      )}
      {isFill ? (
        <Ellipse cx={CX} cy={C1Y} rx={RX} ry={RY} fill={color} opacity={0.6} />
      ) : (
        <Ellipse
          cx={CX}
          cy={C1Y}
          rx={RX}
          ry={RY}
          fill={isDuo ? color : 'none'}
          fillOpacity={isDuo ? 0.18 : 0}
          stroke={color}
          strokeWidth={sw}
        />
      )}

      {/* Middle coin (c2) */}
      {isFill ? (
        <Rect x={CX - RX} y={C2Y} width={RX * 2} height={edgeH} fill={color} opacity={0.72} />
      ) : (
        <G>
          <Rect x={CX - RX + sw / 2} y={C2Y} width={RX * 2 - sw} height={edgeH} fill={color} opacity={0.2} />
          <Line x1={CX - RX} y1={C2Y} x2={CX - RX} y2={C2Y + edgeH} stroke={color} strokeWidth={sw} strokeLinecap="round" />
          <Line x1={CX + RX} y1={C2Y} x2={CX + RX} y2={C2Y + edgeH} stroke={color} strokeWidth={sw} strokeLinecap="round" />
        </G>
      )}
      {isFill ? (
        <Ellipse cx={CX} cy={C2Y} rx={RX} ry={RY} fill={color} opacity={0.8} />
      ) : (
        <Ellipse
          cx={CX}
          cy={C2Y}
          rx={RX}
          ry={RY}
          fill={isDuo ? color : 'none'}
          fillOpacity={isDuo ? 0.22 : 0}
          stroke={color}
          strokeWidth={sw}
        />
      )}

      {/* Top coin (c3) — accent */}
      {isFill ? (
        <Ellipse cx={CX} cy={C3Y} rx={RX} ry={RY} fill={color} />
      ) : isDuo ? (
        <G>
          <Ellipse cx={CX} cy={C3Y} rx={RX} ry={RY} fill={EMBER} opacity={0.22} />
          <Ellipse cx={CX} cy={C3Y} rx={RX} ry={RY} fill="none" stroke={color} strokeWidth={sw} />
          <Line x1={CX - 32} y1={C3Y - 4} x2={CX + 32} y2={C3Y - 4} stroke={color} strokeWidth={8} strokeLinecap="round" opacity={0.55} />
          <Line x1={CX - 20} y1={C3Y + 8} x2={CX + 20} y2={C3Y + 8} stroke={color} strokeWidth={6} strokeLinecap="round" opacity={0.35} />
        </G>
      ) : (
        <G>
          <Ellipse cx={CX} cy={C3Y} rx={RX} ry={RY} fill="none" stroke={color} strokeWidth={sw} />
          <Line x1={CX - 32} y1={C3Y - 4} x2={CX + 32} y2={C3Y - 4} stroke={color} strokeWidth={8} strokeLinecap="round" opacity={0.5} />
          <Line x1={CX - 20} y1={C3Y + 8} x2={CX + 20} y2={C3Y + 8} stroke={color} strokeWidth={6} strokeLinecap="round" opacity={0.3} />
        </G>
      )}

      {isDuo ? (
        <Ellipse cx={CX} cy={C3Y} rx={RX - 10} ry={RY - 6} fill={EMBER} opacity={0.18} />
      ) : null}
    </Canvas>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 9. TAG — два пересекающихся ярлыка с «%»
// ═══════════════════════════════════════════════════════════════════════════

const TAG1_D =
  'M 30 90 h 130 l 46 38 l -46 38 h -130 a 16 16 0 0 1 -16 -16 v -44 a 16 16 0 0 1 16 -16 Z';
const TAG2_D =
  'M 60 118 h 130 l 46 38 l -46 38 h -130 a 16 16 0 0 1 -16 -16 v -44 a 16 16 0 0 1 16 -16 Z';

export const TagCustom: React.FC<CustomIconProps> = ({
  size = 24,
  color = DEFAULT_COLOR,
  weight = 'regular',
  hitSlop,
  testID,
  style,
}) => {
  const isFill = weight === 'fill';
  const isDuo = weight === 'duotone';

  return (
    <Canvas size={size} hitSlop={hitSlop} testID={testID} style={style}>
      {!isFill && size >= 32 ? (
        <Halo
          d={TAG1_D}
          scale={1.16}
          opacity={isDuo ? 0.48 : 0.3}
          color={color}
        />
      ) : null}
      <Path d={TAG2_D} fill={color} opacity={isFill ? 0.55 : 0.6} />
      <Path d={TAG1_D} fill={color} />
      <Circle cx={52} cy={128} r={10} fill={WHITE} opacity={0.9} />
      <Circle cx={82} cy={156} r={10} fill={WHITE} opacity={0.9} />
      {!isFill && size >= 32 ? (
        <SvgText
          x={148}
          y={146}
          textAnchor="middle"
          fontFamily="Inter"
          fontWeight="900"
          fontSize={52}
          fill={WHITE}
        >
          %
        </SvgText>
      ) : null}
      {isDuo ? <Path d={TAG2_D} fill={EMBER} opacity={0.4} /> : null}
    </Canvas>
  );
};
