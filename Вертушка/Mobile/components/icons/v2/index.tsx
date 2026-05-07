/**
 * Polish Vertushka v4 — кастомный icon set (B2 v2 frosted-silhouette + halo).
 *
 * Дословный порт `b2v2-icons.jsx` от design Claude на react-native-svg.
 * 50 имён: 45 «phosphor-replacements» + 5 hero (disc / gift / trophy / scan /
 * vinyl-label). Каждая иконка в своём фрагменте — никаких единых шаблонов,
 * чтобы силуэты не сливались в «один и тот же значок».
 *
 * Контракт props совместим с Phosphor Icon: { size, color, weight }.
 *   - weight === 'fill'    → solid silhouette без halo (для active-state)
 *   - weight === 'duotone' → halo + ember-акценты (где предусмотрено)
 *   - regular / любое      → silhouette + halo (default look)
 *
 * Halo рендерится внутри SVG через `<Filter><FeGaussianBlur>` (нативная
 * поддержка react-native-svg v15+) — поэтому wrapper в `Icon.tsx` halo НЕ
 * накладывает: достаточно одного.
 */

import React from 'react';
import {
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Defs,
  Filter,
  FeGaussianBlur,
  Rect,
  Circle,
  Path,
  Line,
  Ellipse,
  G,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';

// ───────────────────────────────────────────────────────────────────────────
// Public props
// ───────────────────────────────────────────────────────────────────────────

export interface V2IconProps {
  size?: number;
  color?: string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone' | string;
  hitSlop?: number;
  testID?: string;
  style?: StyleProp<ViewStyle>;
  mirrored?: boolean;
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers — копия из исходника
// ───────────────────────────────────────────────────────────────────────────

const isFill = (w?: string) => w === 'fill';
const isDuotone = (w?: string) => w === 'duotone';
const haloOp = (w?: string) => (isDuotone(w) ? 0.5 : 0.32);
const scaleAround = (s: number, cx = 128, cy = 128) =>
  `translate(${cx * (1 - s)} ${cy * (1 - s)}) scale(${s})`;

const EMBER = '#E85A2A';

let counter = 0;
const nextId = () => `v2-${++counter}`;

// ───────────────────────────────────────────────────────────────────────────
// Canvas — выдаёт <Svg> + <Defs><Filter><FeGaussianBlur>.
// `id` уникальный per-render, чтобы при множестве иконок на экране filter не
// конфликтовал.
// ───────────────────────────────────────────────────────────────────────────

interface CanvasProps {
  size: number;
  testID?: string;
  children: (fid: string) => React.ReactNode;
}

const Canvas: React.FC<CanvasProps> = ({ size, testID, children }) => {
  const idRef = React.useRef<string | null>(null);
  if (!idRef.current) idRef.current = nextId();
  const fid = `halo-${idRef.current}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256" testID={testID}>
      <Defs>
        <Filter id={fid} x="-40%" y="-40%" width="180%" height="180%">
          <FeGaussianBlur stdDeviation={10} />
        </Filter>
      </Defs>
      {children(fid)}
    </Svg>
  );
};

// AccentText — текст-акцент внутри иконки (?, $, G, %, 31, 1, ⌘).
// react-native-svg не поддерживает `dominantBaseline`, поэтому используем
// `alignmentBaseline='central'` — на iOS/Android рендерит так же.
const Accent: React.FC<{
  x: number;
  y: number;
  fontSize: number;
  children: string;
  fill?: string;
}> = ({ x, y, fontSize, children, fill = '#FFFFFF' }) => (
  <SvgText
    x={x}
    y={y}
    textAnchor="middle"
    alignmentBaseline="central"
    fontSize={fontSize}
    fontWeight="700"
    fontFamily="Inter"
    fill={fill}
  >
    {children}
  </SvgText>
);

// ═══════════════════════════════════════════════════════════════════════════
// 45 PHOSPHOR REPLACEMENTS
// ═══════════════════════════════════════════════════════════════════════════

// 1. plus
export const PlusV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Rect x={96} y={20} width={64} height={216} rx={32} fill={color} transform={scaleAround(1.18)} />
          <Rect x={20} y={96} width={216} height={64} rx={32} fill={color} transform={scaleAround(1.18)} />
        </G>
      )}
      <Rect x={96} y={24} width={64} height={208} rx={32} fill={color} />
      <Rect x={24} y={96} width={208} height={64} rx={32} fill={color} />
    </>
  )}</Canvas>
);

// 2. plus-circle
export const PlusCircleV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Rect x={96} y={68} width={64} height={120} rx={20} fill="#fff" />
      <Rect x={68} y={96} width={120} height={64} rx={20} fill="#fff" />
    </>
  )}</Canvas>
);

// 3. check
export const CheckV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M36 128L96 196L220 72" stroke={color} strokeWidth={48} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M44 132L96 192L212 76" stroke={color} strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" />
    </>
  )}</Canvas>
);

// 4. check-circle
export const CheckCircleV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Path d="M72 128L108 168L184 88" stroke="#fff" strokeWidth={28} strokeLinecap="round" strokeLinejoin="round" />
    </>
  )}</Canvas>
);

// 5. x
export const XV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Path d="M56 56L200 200" stroke={color} strokeWidth={48} strokeLinecap="round" />
          <Path d="M200 56L56 200" stroke={color} strokeWidth={48} strokeLinecap="round" />
        </G>
      )}
      <Path d="M60 60L196 196" stroke={color} strokeWidth={40} strokeLinecap="round" />
      <Path d="M196 60L60 196" stroke={color} strokeWidth={40} strokeLinecap="round" />
    </>
  )}</Canvas>
);

// 6. x-circle
export const XCircleV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Path d="M84 84L172 172" stroke="#fff" strokeWidth={26} strokeLinecap="round" />
      <Path d="M172 84L84 172" stroke="#fff" strokeWidth={26} strokeLinecap="round" />
    </>
  )}</Canvas>
);

// 7. pencil
export const PencilV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={48} y={32} width={160} height={192} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={56} y={36} width={144} height={148} rx={24} fill={color} />
      <Rect x={72} y={192} width={112} height={36} rx={18} fill={color} opacity={0.55} />
      <Path d="M88 88L168 88M88 120L168 120M88 152L140 152" stroke="#fff" strokeWidth={16} strokeLinecap="round" />
    </>
  )}</Canvas>
);

// 8. trash
export const TrashV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={40} y={64} width={176} height={160} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={44} y={68} width={168} height={152} rx={24} fill={color} />
      <Rect x={84} y={28} width={88} height={44} rx={20} fill={color} />
      <Rect x={24} y={52} width={208} height={32} rx={16} fill={color} />
      <Path d="M100 108L100 172M128 108L128 172M156 108L156 172" stroke="#fff" strokeWidth={14} strokeLinecap="round" />
    </>
  )}</Canvas>
);

// 9. camera
export const CameraV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={20} y={72} width={216} height={160} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={24} y={76} width={208} height={148} rx={24} fill={color} />
      <Rect x={80} y={36} width={96} height={44} rx={20} fill={color} />
      <Circle cx={128} cy={152} r={40} fill="#fff" opacity={0.22} />
      <Circle cx={128} cy={152} r={24} fill="#fff" opacity={0.55} />
    </>
  )}</Canvas>
);

// 10. envelope
export const EnvelopeV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={20} y={56} width={216} height={156} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={24} y={60} width={208} height={148} rx={24} fill={color} />
      <Path d="M24 84L128 156L232 84" stroke="#fff" strokeWidth={18} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )}</Canvas>
);

// 11. download
export const DownloadV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Path d="M128 28L128 168" stroke={color} strokeWidth={40} strokeLinecap="round" />
          <Rect x={36} y={184} width={184} height={44} rx={22} fill={color} />
        </G>
      )}
      <Path d="M128 32L128 164" stroke={color} strokeWidth={32} strokeLinecap="round" />
      <Path d="M64 116L128 180L192 116" fill={color} />
      <Rect x={40} y={188} width={176} height={40} rx={20} fill={color} />
    </>
  )}</Canvas>
);

// 12. share
export const ShareV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Circle cx={64} cy={128} r={40} fill={color} />
          <Circle cx={192} cy={64} r={36} fill={color} />
          <Circle cx={192} cy={192} r={36} fill={color} />
        </G>
      )}
      <Circle cx={64} cy={128} r={36} fill={color} />
      <Circle cx={192} cy={64} r={32} fill={color} />
      <Circle cx={192} cy={192} r={32} fill={color} />
      <Path d="M96 116L160 80M96 140L160 176" stroke={color} strokeWidth={20} strokeLinecap="round" />
    </>
  )}</Canvas>
);

// 13. arrow-clockwise
export const ArrowClockwiseV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={96} stroke={color} strokeWidth={40} fill="none" filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M128 32 A96 96 0 1 1 52 80" stroke={color} strokeWidth={32} strokeLinecap="round" fill="none" />
      <Polygon points="52,36 92,92 16,92" fill={color} transform="rotate(-30 52 80)" />
    </>
  )}</Canvas>
);

// 14. heart — округлое filled
export const HeartV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => {
  const HRT = 'M128 215C108 200 36 158 28 104C22 68 48 36 84 36C104 36 120 48 128 64C136 48 152 36 172 36C208 36 234 68 228 104C220 158 148 200 128 215Z';
  return (
    <Canvas size={size} testID={testID}>{(fid) => (
      <>
        {!isFill(weight) && <Path d={HRT} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} transform={scaleAround(1.18)} />}
        <Path d={HRT} fill={color} />
        {!isFill(weight) && <Path d="M 68 80 A 52 52 0 0 1 100 54" fill="none" stroke="#fff" strokeWidth={7} strokeLinecap="round" opacity={isDuotone(weight) ? 0.55 : 0.4} />}
      </>
    )}</Canvas>
  );
};

// 15. arrow-left
export const ArrowLeftV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M208 128H48M48 128L116 60M48 128L116 196" stroke={color} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M204 128H52M52 128L120 64M52 128L120 192" stroke={color} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" />
    </>
  )}</Canvas>
);

// 16. arrow-right
export const ArrowRightV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M48 128H208M208 128L140 60M208 128L140 196" stroke={color} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M52 128H204M204 128L136 64M204 128L136 192" stroke={color} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" />
    </>
  )}</Canvas>
);

// 17. caret-left
export const CaretLeftV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M164 52L76 128L164 204" stroke={color} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`} opacity={haloOp(weight)} fill="none" />}
      <Path d="M160 56L80 128L160 200" stroke={color} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )}</Canvas>
);

// 18. caret-right
export const CaretRightV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M92 52L180 128L92 204" stroke={color} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`} opacity={haloOp(weight)} fill="none" />}
      <Path d="M96 56L176 128L96 200" stroke={color} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )}</Canvas>
);

// caret-up / caret-down — повёрнутые caret-left/right
export const CaretUpV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M52 164L128 76L204 164" stroke={color} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`} opacity={haloOp(weight)} fill="none" />}
      <Path d="M56 160L128 80L200 160" stroke={color} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )}</Canvas>
);
export const CaretDownV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M52 92L128 180L204 92" stroke={color} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`} opacity={haloOp(weight)} fill="none" />}
      <Path d="M56 96L128 176L200 96" stroke={color} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )}</Canvas>
);

// arrow-up / arrow-down (выводы из arrow-left/right через смену координат)
export const ArrowUpV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M128 208V48M128 48L60 116M128 48L196 116" stroke={color} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`} opacity={haloOp(weight)} fill="none" />}
      <Path d="M128 204V52M128 52L64 120M128 52L192 120" stroke={color} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )}</Canvas>
);
export const ArrowDownV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M128 48V208M128 208L60 140M128 208L196 140" stroke={color} strokeWidth={44} strokeLinecap="round" strokeLinejoin="round" filter={`url(#${fid})`} opacity={haloOp(weight)} fill="none" />}
      <Path d="M128 52V204M128 204L64 136M128 204L192 136" stroke={color} strokeWidth={36} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )}</Canvas>
);

// 19. magnifying-glass
export const MagnifyingGlassV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={108} cy={108} r={76} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={108} cy={108} r={72} fill={color} />
      <Circle cx={108} cy={108} r={44} fill="#fff" opacity={0.9} />
      <Rect x={157} y={155} width={72} height={36} rx={18} fill={color} transform="rotate(45 157 155)" />
    </>
  )}</Canvas>
);

// 20. user
export const UserV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Circle cx={128} cy={80} r={56} fill={color} />
          <Path d="M20 220c0-56 28-96 108-96s108 40 108 96" fill={color} />
        </G>
      )}
      <Circle cx={128} cy={80} r={52} fill={color} />
      <Path d="M24 220c0-52 28-92 104-92s104 40 104 92z" fill={color} />
    </>
  )}</Canvas>
);

// 21. warning-circle
export const WarningCircleV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Rect x={112} y={68} width={32} height={88} rx={16} fill="#fff" />
      <Circle cx={128} cy={184} r={16} fill="#fff" />
    </>
  )}</Canvas>
);

// 22. bell
export const BellV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M128 24C84 24 52 60 52 104v72l-20 24h192l-20-24v-72c0-44-32-80-76-80z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M128 28C88 28 56 62 56 104v68l-18 22h180l-18-22v-68c0-42-32-76-72-76z" fill={color} />
      <Rect x={104} y={200} width={48} height={28} rx={14} fill={color} />
    </>
  )}</Canvas>
);

// 23. bell-slash
export const BellSlashV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M128 28C88 28 56 62 56 104v68l-18 22h180l-18-22v-68c0-42-32-76-72-76z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M128 28C88 28 56 62 56 104v68l-18 22h180l-18-22v-68c0-42-32-76-72-76z" fill={color} />
      <Rect x={104} y={200} width={48} height={28} rx={14} fill={color} />
      <Rect x={28} y={20} width={200} height={28} rx={14} fill="#fff" opacity={0.9} transform="rotate(45 128 128)" />
    </>
  )}</Canvas>
);

// 24. cloud-slash
export const CloudSlashV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M196 172H80a56 56 0 0 1 0-112c2 0 4 0 6 1a72 72 0 0 1 134 36 44 44 0 0 1-24 75z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M192 168H84a52 52 0 0 1 0-104l6 1a68 68 0 0 1 126 34 40 40 0 0 1-24 69z" fill={color} />
      <Rect x={28} y={20} width={200} height={28} rx={14} fill="#fff" opacity={0.9} transform="rotate(45 128 128)" />
    </>
  )}</Canvas>
);

// 25. lock-open
export const LockOpenV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={44} y={100} width={168} height={136} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={48} y={104} width={160} height={128} rx={24} fill={color} />
      <Path d="M96 104V76a32 32 0 0 1 64 0" stroke={color} strokeWidth={24} strokeLinecap="round" fill="none" />
      <Circle cx={128} cy={156} r={20} fill="#fff" opacity={0.7} />
      <Rect x={116} y={168} width={24} height={32} rx={8} fill="#fff" opacity={0.5} />
    </>
  )}</Canvas>
);

// 26. question
export const QuestionV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Accent x={128} y={136} fontSize={108}>?</Accent>
    </>
  )}</Canvas>
);

// 27. keyhole
export const KeyholeV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={36} y={24} width={184} height={208} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={40} y={28} width={176} height={200} rx={24} fill={color} />
      <Rect x={20} y={48} width={176} height={200} rx={24} fill={color} opacity={0.5} />
      <Circle cx={128} cy={116} r={28} fill="#fff" opacity={0.6} />
      <Accent x={128} y={175} fontSize={44}>⌘</Accent>
    </>
  )}</Canvas>
);

// 28. dots-three
export const DotsThreeV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Circle cx={56} cy={128} r={28} fill={color} />
          <Circle cx={128} cy={128} r={28} fill={color} />
          <Circle cx={200} cy={128} r={28} fill={color} />
        </G>
      )}
      <Circle cx={56} cy={128} r={24} fill={color} />
      <Circle cx={128} cy={128} r={24} fill={color} />
      <Circle cx={200} cy={128} r={24} fill={color} />
    </>
  )}</Canvas>
);

// 29. dots-three-vertical
export const DotsThreeVerticalV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Circle cx={128} cy={56} r={28} fill={color} />
          <Circle cx={128} cy={128} r={28} fill={color} />
          <Circle cx={128} cy={200} r={28} fill={color} />
        </G>
      )}
      <Circle cx={128} cy={56} r={24} fill={color} />
      <Circle cx={128} cy={128} r={24} fill={color} />
      <Circle cx={128} cy={200} r={24} fill={color} />
    </>
  )}</Canvas>
);

// 30. squares-four
export const SquaresFourV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Rect x={24} y={24} width={92} height={92} rx={20} fill={color} />
          <Rect x={140} y={24} width={92} height={92} rx={20} fill={color} />
          <Rect x={24} y={140} width={92} height={92} rx={20} fill={color} />
          <Rect x={140} y={140} width={92} height={92} rx={20} fill={color} />
        </G>
      )}
      <Rect x={28} y={28} width={88} height={88} rx={18} fill={color} />
      <Rect x={140} y={28} width={88} height={88} rx={18} fill={color} />
      <Rect x={28} y={140} width={88} height={88} rx={18} fill={color} />
      <Rect x={140} y={140} width={88} height={88} rx={18} fill={color} />
    </>
  )}</Canvas>
);

// 31. list
export const ListV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={24} y={24} width={208} height={208} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={28} y={28} width={200} height={200} rx={24} fill={color} />
      <Rect x={56} y={72} width={144} height={20} rx={10} fill="#fff" />
      <Rect x={56} y={108} width={144} height={20} rx={10} fill="#fff" />
      <Rect x={56} y={144} width={108} height={20} rx={10} fill="#fff" />
      <Circle cx={48} cy={82} r={12} fill="#fff" opacity={0.5} />
      <Circle cx={48} cy={118} r={12} fill="#fff" opacity={0.5} />
      <Circle cx={48} cy={154} r={12} fill="#fff" opacity={0.5} />
    </>
  )}</Canvas>
);

// 32. sliders
export const SlidersV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={24} y={24} width={208} height={208} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={28} y={28} width={200} height={200} rx={24} fill={color} />
      <Rect x={52} y={76} width={152} height={16} rx={8} fill="#fff" opacity={0.4} />
      <Rect x={52} y={120} width={152} height={16} rx={8} fill="#fff" opacity={0.4} />
      <Rect x={52} y={164} width={152} height={16} rx={8} fill="#fff" opacity={0.4} />
      <Circle cx={88} cy={84} r={16} fill="#fff" />
      <Circle cx={148} cy={128} r={16} fill="#fff" />
      <Circle cx={108} cy={172} r={16} fill="#fff" />
    </>
  )}</Canvas>
);

// 33. arrows-down-up
export const ArrowsDownUpV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Path d="M80 32L80 196M80 196L44 160M80 196L116 160" stroke={color} strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Path d="M176 224L176 60M176 60L140 96M176 60L212 96" stroke={color} strokeWidth={40} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </G>
      )}
      <Path d="M80 36L80 192M80 192L48 160M80 192L112 160" stroke={color} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Path d="M176 220L176 64M176 64L144 96M176 64L208 96" stroke={color} strokeWidth={32} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  )}</Canvas>
);

// 34. calendar
export const CalendarV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={20} y={36} width={216} height={200} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={24} y={40} width={208} height={192} rx={24} fill={color} />
      <Rect x={24} y={88} width={208} height={24} fill={color} opacity={0.6} />
      <Rect x={80} y={24} width={20} height={36} rx={10} fill={color} />
      <Rect x={156} y={24} width={20} height={36} rx={10} fill={color} />
      <Accent x={128} y={164} fontSize={80}>31</Accent>
    </>
  )}</Canvas>
);

// 35. clock
export const ClockV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Path d="M128 68L128 132L172 160" stroke="#fff" strokeWidth={20} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Circle cx={128} cy={128} r={10} fill="#fff" />
    </>
  )}</Canvas>
);

// 36. globe
export const GlobeV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Ellipse cx={128} cy={128} rx={48} ry={108} fill="none" stroke="#fff" strokeWidth={10} opacity={0.55} />
      <Line x1={20} y1={128} x2={236} y2={128} stroke="#fff" strokeWidth={10} opacity={0.55} />
      <Line x1={36} y1={84} x2={220} y2={84} stroke="#fff" strokeWidth={7} opacity={0.35} />
      <Line x1={36} y1={172} x2={220} y2={172} stroke="#fff" strokeWidth={7} opacity={0.35} />
    </>
  )}</Canvas>
);

// 37. buildings
export const BuildingsV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Rect x={16} y={72} width={128} height={164} rx={20} fill={color} />
          <Rect x={132} y={104} width={108} height={132} rx={20} fill={color} />
        </G>
      )}
      <Rect x={20} y={76} width={120} height={156} rx={18} fill={color} />
      <Rect x={136} y={108} width={100} height={124} rx={18} fill={color} opacity={0.7} />
      <Rect x={44} y={108} width={24} height={24} rx={8} fill="#fff" opacity={0.6} />
      <Rect x={84} y={108} width={24} height={24} rx={8} fill="#fff" opacity={0.6} />
      <Rect x={44} y={148} width={24} height={24} rx={8} fill="#fff" opacity={0.6} />
      <Rect x={84} y={148} width={24} height={24} rx={8} fill="#fff" opacity={0.6} />
      <Rect x={152} y={140} width={20} height={20} rx={6} fill="#fff" opacity={0.5} />
      <Rect x={184} y={140} width={20} height={20} rx={6} fill="#fff" opacity={0.5} />
    </>
  )}</Canvas>
);

// 38. folder
export const FolderV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={16} y={64} width={224} height={164} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={20} y={68} width={216} height={156} rx={24} fill={color} />
      <Rect x={20} y={44} width={100} height={40} rx={20} fill={color} opacity={0.7} />
    </>
  )}</Canvas>
);

// 39. tag
export const TagV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Rect x={28} y={80} width={144} height={144} rx={24} fill={color} transform="rotate(-45 128 128)" />
          <Rect x={60} y={44} width={144} height={144} rx={24} fill={color} transform="rotate(-45 128 128)" />
        </G>
      )}
      <Rect x={32} y={84} width={136} height={136} rx={22} fill={color} transform="rotate(-45 128 128)" />
      <Rect x={64} y={48} width={136} height={136} rx={22} fill={color} opacity={0.55} transform="rotate(-45 128 128)" />
      <Circle cx={92} cy={80} r={14} fill="#fff" opacity={0.8} />
      <Accent x={132} y={148} fontSize={60}>%</Accent>
    </>
  )}</Canvas>
);

// 40. map-pin
export const MapPinV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Path d="M128 24C84 24 52 58 52 100c0 60 76 132 76 132s76-72 76-132c0-42-32-76-76-76z" fill={color} />
        </G>
      )}
      <Path d="M128 28C88 28 56 60 56 100c0 56 72 128 72 128s72-72 72-128c0-40-32-72-72-72z" fill={color} />
      <Circle cx={128} cy={100} r={28} fill="#fff" opacity={0.7} />
    </>
  )}</Canvas>
);

// 41. map-trifold
export const MapTrifoldV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={20} y={44} width={216} height={168} rx={24} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={24} y={48} width={208} height={160} rx={20} fill={color} />
      <Path d="M84 48L84 208M172 48L172 208" stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.45} />
      <Path d="M52 148 Q 80 100 128 120 Q 176 140 204 92" stroke="#fff" strokeWidth={12} strokeLinecap="round" fill="none" opacity={0.7} />
      <Circle cx={52} cy={148} r={10} fill="#fff" opacity={0.9} />
    </>
  )}</Canvas>
);

// 42. currency-circle-dollar
export const CurrencyDollarV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Accent x={128} y={136} fontSize={108}>$</Accent>
    </>
  )}</Canvas>
);

// 43. star
export const StarV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M128 20l28 84h88l-71 52 27 84-72-52-72 52 27-84L12 104h88z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M128 24l26 80h84l-68 50 26 80-68-50-68 50 26-80L18 104h84z" fill={color} />
    </>
  )}</Canvas>
);

// 44. sparkle
export const SparkleV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M128 20L148 108L236 128L148 148L128 236L108 148L20 128L108 108Z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M128 24L146 108L232 128L146 148L128 232L110 148L24 128L110 108Z" fill={color} />
    </>
  )}</Canvas>
);

// 45. google-logo
export const GoogleLogoV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Accent x={128} y={140} fontSize={88}>G</Accent>
    </>
  )}</Canvas>
);

// ═══════════════════════════════════════════════════════════════════════════
// HERO ICONS
// ═══════════════════════════════════════════════════════════════════════════

// H1. disc — solid круг + две дуги
export const DiscV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'duotone', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      {!isFill(weight) && (
        <>
          <Path d="M72 80 A72 72 0 1 1 68 180" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={isDuotone(weight) ? 0.75 : 0.6} />
          <Path d="M96 96 A44 44 0 1 1 93 164" fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" opacity={isDuotone(weight) ? 0.55 : 0.42} />
        </>
      )}
      <Circle cx={128} cy={128} r={10} fill="#fff" opacity={isFill(weight) ? 0.25 : 0.9} />
    </>
  )}</Canvas>
);

// H2. gift
export const GiftV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={28} y={92} width={200} height={136} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={32} y={92} width={192} height={44} rx={22} fill={color} />
      <Rect x={44} y={128} width={168} height={104} rx={22} fill={color} opacity={0.8} />
      <Rect x={112} y={92} width={32} height={140} rx={16} fill="#fff" opacity={0.3} />
      <Circle cx={128} cy={72} r={28} fill={color} />
      <Circle cx={128} cy={72} r={16} fill="none" stroke="#fff" strokeWidth={5} opacity={0.5} />
      <Circle cx={128} cy={72} r={6} fill="#fff" opacity={0.9} />
      <Circle cx={188} cy={52} r={22} fill={isDuotone(weight) ? EMBER : color} />
      <Accent x={188} y={53} fontSize={24}>1</Accent>
    </>
  )}</Canvas>
);

// H3. trophy
export const TrophyV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M64 40h128l-8 100Q184 184 128 184Q72 184 72 140Z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M68 44h120l-8 96Q180 180 128 180Q76 180 76 140Z" fill={color} />
      <Path d="M68 56Q32 56 32 100Q32 136 68 140" fill="none" stroke={color} strokeWidth={20} strokeLinecap="round" />
      <Path d="M188 56Q224 56 224 100Q224 136 188 140" fill="none" stroke={color} strokeWidth={20} strokeLinecap="round" />
      <Rect x={116} y={180} width={24} height={36} rx={12} fill={color} />
      <Rect x={76} y={208} width={104} height={24} rx={12} fill={color} />
      <Circle cx={128} cy={108} r={40} fill="#fff" opacity={0.2} />
      <Circle cx={128} cy={108} r={26} fill="#fff" opacity={0.35} />
      <Circle cx={128} cy={108} r={10} fill="#fff" opacity={0.8} />
    </>
  )}</Canvas>
);

// H4. scan
export const ScanV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => {
  const m = 28;
  const br = 52;
  const sw = 18;
  const r = 14;
  const N = 256;
  const BK =
    `M${m + br} ${m} L${m + r} ${m} Q${m} ${m} ${m} ${m + r} L${m} ${m + br} ` +
    `M${N - m - br} ${m} L${N - m - r} ${m} Q${N - m} ${m} ${N - m} ${m + r} L${N - m} ${m + br} ` +
    `M${N - m} ${N - m - br} L${N - m} ${N - m - r} Q${N - m} ${N - m} ${N - m - r} ${N - m} L${N - m - br} ${N - m} ` +
    `M${m} ${N - m - br} L${m} ${N - m - r} Q${m} ${N - m} ${m + r} ${N - m} L${m + br} ${N - m}`;
  return (
    <Canvas size={size} testID={testID}>{(fid) => (
      <>
        {!isFill(weight) && (
          <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
            <Path d={BK} fill="none" stroke={color} strokeWidth={sw + 8} strokeLinecap="round" strokeLinejoin="round" />
            <Line x1={m + 10} y1={128} x2={N - m - 10} y2={128} stroke={color} strokeWidth={sw + 8} strokeLinecap="round" />
          </G>
        )}
        <Path d={BK} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={m + 10} y1={128} x2={N - m - 10} y2={128} stroke={color} strokeWidth={sw} strokeLinecap="round" />
      </>
    )}</Canvas>
  );
};

// H5. vinyl-label
export const VinylLabelV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Circle cx={128} cy={128} r={112} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={128} cy={128} r={108} fill={color} />
      <Circle cx={128} cy={128} r={76} fill="none" stroke="#fff" strokeWidth={8} opacity={0.28} />
      <Circle cx={128} cy={128} r={50} fill="none" stroke="#fff" strokeWidth={6} opacity={0.22} />
      <Circle cx={128} cy={128} r={30} fill="#fff" opacity={0.85} />
      <Circle cx={128} cy={128} r={10} fill={color} />
    </>
  )}</Canvas>
);

// ═══════════════════════════════════════════════════════════════════════════
// EYE / EYE-SLASH (отсутствуют в b2v2, делаем в той же стилистике)
// ═══════════════════════════════════════════════════════════════════════════

export const EyeV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M16 128 Q 80 56 128 56 Q 176 56 240 128 Q 176 200 128 200 Q 80 200 16 128 Z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M20 128 Q 80 60 128 60 Q 176 60 236 128 Q 176 196 128 196 Q 80 196 20 128 Z" fill={color} />
      <Circle cx={128} cy={128} r={36} fill="#fff" opacity={0.9} />
      <Circle cx={128} cy={128} r={18} fill={color} />
    </>
  )}</Canvas>
);

export const EyeSlashV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M16 128 Q 80 56 128 56 Q 176 56 240 128 Q 176 200 128 200 Q 80 200 16 128 Z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M20 128 Q 80 60 128 60 Q 176 60 236 128 Q 176 196 128 196 Q 80 196 20 128 Z" fill={color} />
      <Circle cx={128} cy={128} r={36} fill="#fff" opacity={0.9} />
      <Circle cx={128} cy={128} r={18} fill={color} />
      <Rect x={28} y={20} width={200} height={28} rx={14} fill="#fff" opacity={0.95} transform="rotate(45 128 128)" />
    </>
  )}</Canvas>
);

// copy
export const CopyV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={64} y={64} width={168} height={168} rx={24} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Rect x={28} y={28} width={144} height={144} rx={20} fill={color} opacity={0.55} />
      <Rect x={68} y={68} width={160} height={160} rx={20} fill={color} />
    </>
  )}</Canvas>
);

// users (group)
export const UsersV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M88 124a44 44 0 1 1 0-88 44 44 0 0 1 0 88zm0 16c52 0 84 28 84 76H4c0-48 32-76 84-76z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Circle cx={88} cy={80} r={40} fill={color} />
      <Path d="M8 220c0-48 32-80 80-80s80 32 80 80z" fill={color} />
      <Circle cx={184} cy={84} r={32} fill={color} opacity={0.7} />
      <Path d="M148 220c0-36 24-56 60-56s40 20 40 56z" fill={color} opacity={0.7} />
    </>
  )}</Canvas>
);

// user-plus / user-minus
export const UserPlusV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Circle cx={104} cy={84} r={48} fill={color} />
          <Path d="M16 220c0-44 32-76 88-76s88 32 88 76" fill={color} />
        </G>
      )}
      <Circle cx={104} cy={80} r={44} fill={color} />
      <Path d="M20 220c0-40 32-72 84-72s84 32 84 72z" fill={color} />
      <Circle cx={196} cy={88} r={28} fill={color} />
      <Rect x={184} y={72} width={24} height={64} rx={8} fill="#fff" />
      <Rect x={164} y={92} width={64} height={24} rx={8} fill="#fff" />
    </>
  )}</Canvas>
);

export const UserMinusV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Circle cx={104} cy={84} r={48} fill={color} />
          <Path d="M16 220c0-44 32-76 88-76s88 32 88 76" fill={color} />
        </G>
      )}
      <Circle cx={104} cy={80} r={44} fill={color} />
      <Path d="M20 220c0-40 32-72 84-72s84 32 84 72z" fill={color} />
      <Circle cx={196} cy={88} r={28} fill={color} />
      <Rect x={164} y={92} width={64} height={24} rx={8} fill="#fff" />
    </>
  )}</Canvas>
);

// music-notes
export const MusicNotesV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && (
        <G filter={`url(#${fid})`} opacity={haloOp(weight)}>
          <Circle cx={72} cy={196} r={36} fill={color} />
          <Circle cx={184} cy={172} r={36} fill={color} />
          <Rect x={96} y={36} width={20} height={172} rx={10} fill={color} />
          <Rect x={208} y={20} width={20} height={156} rx={10} fill={color} />
        </G>
      )}
      <Circle cx={72} cy={196} r={32} fill={color} />
      <Circle cx={184} cy={172} r={32} fill={color} />
      <Rect x={96} y={40} width={20} height={164} rx={10} fill={color} />
      <Rect x={208} y={24} width={20} height={148} rx={10} fill={color} />
      <Path d="M96 56 Q 152 28 220 28" stroke={color} strokeWidth={20} strokeLinecap="round" fill="none" />
    </>
  )}</Canvas>
);

// envelope-open
export const EnvelopeOpenV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Rect x={20} y={88} width={216} height={140} rx={28} fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M24 92 L128 28 L232 92 V204 a20 20 0 0 1 -20 20 H44 a20 20 0 0 1 -20 -20 Z" fill={color} />
      <Path d="M24 92 L128 168 L232 92" stroke="#fff" strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <Rect x={68} y={64} width={120} height={64} rx={6} fill="#fff" opacity={0.85} />
    </>
  )}</Canvas>
);

// chat-circle
export const ChatCircleV2: React.FC<V2IconProps> = ({ size = 24, color = '#2A4BD7', weight = 'regular', testID }) => (
  <Canvas size={size} testID={testID}>{(fid) => (
    <>
      {!isFill(weight) && <Path d="M128 24a104 104 0 0 0-92 152l-16 56 56-16a104 104 0 1 0 52-192z" fill={color} filter={`url(#${fid})`} opacity={haloOp(weight)} />}
      <Path d="M128 28a100 100 0 0 0-88 148l-12 48 48-12a100 100 0 1 0 52-184z" fill={color} />
      <Circle cx={88} cy={128} r={10} fill="#fff" />
      <Circle cx={128} cy={128} r={10} fill="#fff" />
      <Circle cx={168} cy={128} r={10} fill="#fff" />
    </>
  )}</Canvas>
);
