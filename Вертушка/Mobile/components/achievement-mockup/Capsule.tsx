/**
 * Capsule — пилюля для счётчиков и пометок (gold / ember / ivory / navy).
 * Порт GoldCapsule из MainScreen.jsx. Размеры sm/md/lg.
 */
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  M_EMBER,
  M_GOLD,
  M_GOLD_HI,
  M_GOLD_LO,
  M_GOLD_MID,
  M_GOLD_RIM,
  M_IVORY,
  M_NAVY,
} from './palette';

type Tone = 'gold' | 'ember' | 'ivory' | 'navy';
type Size = 'sm' | 'md' | 'lg';

const TONES: Record<
  Tone,
  {
    gradient: [string, string, string] | null;
    bg: string;
    color: string;
    border: string;
  }
> = {
  gold:  { gradient: [M_GOLD_HI, M_GOLD_MID, M_GOLD], bg: M_GOLD, color: M_NAVY, border: M_GOLD },
  ember: { gradient: ['#FF8C5A', M_EMBER, '#B33D14'], bg: M_EMBER, color: M_IVORY, border: '#B33D14' },
  ivory: { gradient: null, bg: M_IVORY, color: M_NAVY, border: M_GOLD },
  navy:  { gradient: null, bg: 'rgba(11,20,56,0.85)', color: M_IVORY, border: M_GOLD_RIM },
};

const SIZES: Record<Size, { fs: number; padH: number; padV: number }> = {
  sm: { fs: 10, padH: 8, padV: 3 },
  md: { fs: 12, padH: 10, padV: 4 },
  lg: { fs: 13, padH: 12, padV: 6 },
};

interface Props {
  children: string;
  tone?: Tone;
  size?: Size;
  style?: StyleProp<ViewStyle>;
}

export function Capsule({ children, tone = 'gold', size = 'md', style }: Props) {
  const t = TONES[tone];
  const s = SIZES[size];

  const content = (
    <Text
      style={{
        color: t.color,
        fontSize: s.fs,
        fontWeight: '700',
        letterSpacing: 0.2,
      }}
    >
      {children}
    </Text>
  );

  const baseStyle: ViewStyle = {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: t.border,
    paddingHorizontal: s.padH,
    paddingVertical: s.padV,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  };

  if (t.gradient) {
    return (
      <LinearGradient
        colors={t.gradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[baseStyle, style]}
      >
        {content}
      </LinearGradient>
    );
  }

  return <View style={[baseStyle, { backgroundColor: t.bg }, style]}>{content}</View>;
}

// Suppress unused import warning if any
const _kept = { _: M_GOLD_LO };
void _kept;

void StyleSheet; // dev keep-alive
