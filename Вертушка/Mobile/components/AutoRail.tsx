/**
 * AutoRail — горизонтальный авто-скроллящийся рейл с обложками.
 * Используется на публичном профиле и на экране Поиска.
 *
 * Авто-движение и ручной свайп идут полностью на UI-треде (Reanimated 3
 * useFrameCallback + Gesture.Pan worklets), поэтому JS-тред свободен для
 * тапов в шапке, а сам свайп идёт за пальцем без срывов и поддерживает
 * инерцию через withDecay.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useFrameCallback,
  withDecay,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { resolveMediaUrl } from '../lib/api';
import { PublicProfileRecord } from '../lib/types';

const PALETTE = {
  ink: '#1B1D26',
  mute: '#9096A6',
  lavender: '#C9B8FF',
  periwinkle: '#9AA8FF',
  cobalt: '#3A4BE0',
};

const HORIZONTAL_PADDING = 20;
const RAIL_COVER = 108;
const ITEM_GAP = 12;
const FULL_LOOP_DURATION_MS = 30000;

interface AutoRailProps {
  title: string;
  subtitle: string;
  items: PublicProfileRecord[];
  titleColor: string;
  showYear?: boolean;
  onPick?: (record: PublicProfileRecord) => void;
}

export function AutoRail({
  title,
  subtitle,
  items,
  showYear,
  onPick,
  titleColor,
}: AutoRailProps) {
  const tx = useSharedValue(0);
  const startTx = useSharedValue(0);
  const isPanning = useSharedValue(false);
  const isPaused = useSharedValue(false);
  const halfWidthSV = useSharedValue(0);

  const [rowWidth, setRowWidth] = useState(0);

  useEffect(() => {
    halfWidthSV.value = rowWidth;
  }, [rowWidth, halfWidthSV]);

  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleResume = useCallback(() => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      resumeTimer.current = null;
      isPaused.value = false;
    }, 2500);
  }, [isPaused]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) {
        clearTimeout(resumeTimer.current);
        resumeTimer.current = null;
      }
    };
  }, []);

  // UI-thread авто-движение: каждый кадр сдвигаем tx на speed * dt.
  useFrameCallback((frame) => {
    if (isPanning.value || isPaused.value) return;
    const w = halfWidthSV.value;
    if (!w) return;
    const dt = frame.timeSincePreviousFrame ?? 16;
    const speed = w / FULL_LOOP_DURATION_MS;
    tx.value = tx.value - speed * dt;
  });

  // Визуальная нормализация в [-w, 0] — даёт бесшовный цикл и работает
  // одинаково для авто-движения, драга и инерции.
  const animStyle = useAnimatedStyle(() => {
    const w = halfWidthSV.value;
    if (!w) return { transform: [{ translateX: 0 }] };
    let v = tx.value % w;
    if (v > 0) v -= w;
    return { transform: [{ translateX: v }] };
  });

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-6, 6])
        .failOffsetY([-12, 12])
        .onBegin(() => {
          'worklet';
          isPaused.value = true;
          cancelAnimation(tx);
        })
        .onStart(() => {
          'worklet';
          isPanning.value = true;
          startTx.value = tx.value;
        })
        .onUpdate((e) => {
          'worklet';
          tx.value = startTx.value + e.translationX;
        })
        .onEnd((e) => {
          'worklet';
          isPanning.value = false;
          // Инерция после флика. Пока decay едет — isPaused=true, авто-кадр
          // не дописывает поверх. Когда инерция закончится, через 2.5с
          // карусель сама поедет дальше.
          tx.value = withDecay(
            {
              velocity: e.velocityX,
              deceleration: 0.997,
            },
            () => {
              'worklet';
              runOnJS(scheduleResume)();
            },
          );
        })
        .onFinalize((_, success) => {
          'worklet';
          if (!success) {
            // Просто тап / гесчур не активировался — резюмим автокарусель.
            isPanning.value = false;
            runOnJS(scheduleResume)();
          }
        }),
    [tx, startTx, isPanning, isPaused, scheduleResume],
  );

  if (!items || items.length === 0) return null;

  const renderCard = (r: PublicProfileRecord, key: string) => (
    <TouchableOpacity
      key={key}
      activeOpacity={0.85}
      onPress={() => onPick?.(r)}
      style={{ width: RAIL_COVER }}
    >
      <View style={styles.railCover}>
        {r.cover_image_url ? (
          <Image
            source={resolveMediaUrl(r.cover_image_url)}
            style={{ width: RAIL_COVER, height: RAIL_COVER }}
            cachePolicy="disk"
          />
        ) : (
          <LinearGradient
            colors={[PALETTE.lavender, PALETTE.periwinkle]}
            style={{ width: RAIL_COVER, height: RAIL_COVER }}
          />
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.railArtist,
          { color: titleColor === PALETTE.cobalt ? PALETTE.cobalt : PALETTE.mute },
        ]}
      >
        {r.artist}
      </Text>
      <Text numberOfLines={1} style={styles.railTitleSmall}>
        {r.title}
      </Text>
      {showYear && r.year ? (
        <Text style={styles.railYear}>
          {r.year}
          {r.format_type ? ` · ${r.format_type}` : ''}
          {r.discogs_want ? ` · ♥ ${r.discogs_want}` : ''}
        </Text>
      ) : null}
    </TouchableOpacity>
  );

  const handleRowLayout = (e: LayoutChangeEvent) => {
    // Ширина одной половины + один gap (между последней карточкой первой
    // половины и первой второй) — для бесшовного шва.
    const w = e.nativeEvent.layout.width + ITEM_GAP;
    if (Math.abs(w - rowWidth) > 0.5) {
      setRowWidth(w);
    }
  };

  return (
    <View>
      <View style={styles.railHead}>
        <Text style={[styles.railTitle, { color: titleColor }]}>{title.toUpperCase()}</Text>
        <Text style={styles.railSub}>{subtitle}</Text>
      </View>
      <GestureDetector gesture={panGesture}>
        <View style={styles.viewport}>
          <Animated.View style={[styles.track, animStyle]}>
            <View style={styles.row} onLayout={handleRowLayout}>
              {items.map((r, i) => renderCard(r, `a-${r.id}-${i}`))}
            </View>
            <View style={[styles.row, { marginLeft: ITEM_GAP }]}>
              {items.map((r, i) => renderCard(r, `b-${r.id}-${i}`))}
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  railHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: HORIZONTAL_PADDING,
    marginBottom: 12,
  },
  railTitle: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: '600',
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  railSub: { fontSize: 11, color: PALETTE.mute },
  viewport: {
    overflow: 'hidden',
  },
  track: {
    flexDirection: 'row',
    paddingHorizontal: HORIZONTAL_PADDING,
  },
  row: {
    flexDirection: 'row',
    gap: ITEM_GAP,
  },
  railCover: {
    width: RAIL_COVER,
    height: RAIL_COVER,
    borderRadius: 13,
    overflow: 'hidden',
    backgroundColor: PALETTE.lavender,
    shadowColor: PALETTE.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
  },
  railArtist: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 9,
    letterSpacing: 0.6,
    marginTop: 8,
  },
  railTitleSmall: { fontSize: 11.5, fontWeight: '600', color: PALETTE.ink, marginTop: 2 },
  railYear: { fontSize: 11, color: PALETTE.periwinkle, marginTop: 2 },
});
