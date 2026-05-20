/**
 * WishlistListSwipe — bookmark-style swipe affordance для строк вишлиста.
 *
 * Концепция (по запросу юзера, по примеру Telegram bookmark): постоянно
 * виден узкий ember-«язычок» на правом краю строки с:
 *   - стрелки-индикатор «← ←» (свайп влево)
 *   - вертикальная надпись «СРАВНИТЬ»
 *   - badge с количеством магазинов
 *
 * Это **persistent affordance**: юзер всегда видит что строку можно
 * свайпнуть → откроет полный CTA с ценами. Тап на язычок = свайп.
 *
 * При свайпе/тапе → onOpen() (родитель открывает OffersBottomSheet
 * с топ-3 ценами + альтернативами).
 *
 * Pulse-подсказка играет ОДИН раз за сессию (через
 * useMarketStore.hasSeenSwipeHint) — лёгкое полу-открытие свайпа.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { Icon } from '../ui';
import { Gradients } from '../../constants/theme';
import { useMarketStore } from '../../lib/marketStore';
import { formatPrice } from '../HotStockTag';

interface WishlistListSwipeProps {
  children: React.ReactNode;
  hasOffers: boolean;
  minPriceRub?: number | null;
  storesCount?: number;
  onOpen: () => void;
  style?: StyleProp<ViewStyle>;
}

const PEEK_WIDTH = 32;        // ширина видимого язычка справа
const FULL_REVEAL = 132;      // ширина полного CTA при свайпе
const PULSE_DURATION_MS = 1100;

export function WishlistListSwipe({
  children,
  hasOffers,
  minPriceRub,
  storesCount = 0,
  onOpen,
  style,
}: WishlistListSwipeProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const hasSeenHint = useMarketStore((s) => s.hasSeenSwipeHint);
  const markHintSeen = useMarketStore((s) => s.markSwipeHintSeen);
  const [didPulse, setDidPulse] = useState(false);

  // One-shot teaser-анимация: при первом mount делаем мини-открытие
  useEffect(() => {
    if (!hasOffers || hasSeenHint || didPulse) return;
    const t = setTimeout(() => {
      swipeableRef.current?.openRight();
      setTimeout(() => {
        swipeableRef.current?.close();
        markHintSeen();
        setDidPulse(true);
      }, PULSE_DURATION_MS);
    }, 900);
    return () => clearTimeout(t);
  }, [hasOffers, hasSeenHint, didPulse, markHintSeen]);

  if (!hasOffers) {
    return <View style={style}>{children}</View>;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={(progress) => (
        <FullCTAReveal
          progress={progress}
          minPriceRub={minPriceRub}
          storesCount={storesCount}
          onPress={() => {
            swipeableRef.current?.close();
            onOpen();
          }}
        />
      )}
      friction={1.6}
      rightThreshold={FULL_REVEAL * 0.55}
      overshootRight={false}
      containerStyle={style}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          setTimeout(() => {
            swipeableRef.current?.close();
            onOpen();
          }, 80);
        }
      }}
    >
      <View style={styles.rowWrap}>
        {/* Карточка с правым padding'ом чтобы text/price не наезжал на язычок */}
        <View style={{ paddingRight: PEEK_WIDTH }}>
          {children}
        </View>

        {/* Bookmark-язычок справа. Тап = открыть bottom-sheet (то же что свайп). */}
        <Pressable
          style={styles.peekTab}
          onPress={onOpen}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={
            minPriceRub
              ? `Сравнить цены: от ${minPriceRub} рублей в ${storesCount} магазинах`
              : 'Сравнить цены'
          }
        >
          <LinearGradient
            colors={Gradients.hotStock as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.peekGradient}
          >
            {/* Top: chevron-left × 2 (визуальный hint «свайпай влево») */}
            <View style={styles.peekArrows}>
              <Icon name="chevron-left" size={9} color="onBrand" />
              <Icon name="chevron-left" size={9} color="onBrand" style={{ marginLeft: -3 }} />
            </View>

            {/* Middle: вертикальная надпись «СРАВНИТЬ» (rotated -90deg) */}
            <View style={styles.peekLabelWrap}>
              <Text style={styles.peekLabel} numberOfLines={1}>
                СРАВНИТЬ
              </Text>
            </View>

            {/* Bottom: badge с количеством магазинов */}
            {storesCount > 0 && (
              <View style={styles.peekBadge}>
                <Text style={styles.peekBadgeText}>{storesCount}</Text>
              </View>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </ReanimatedSwipeable>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Full CTA — viewable когда юзер реально свайпнул влево

interface FullCTARevealProps {
  progress: SharedValue<number>;
  minPriceRub?: number | null;
  storesCount?: number;
  onPress: () => void;
}

function FullCTAReveal({ progress, minPriceRub, storesCount, onPress }: FullCTARevealProps) {
  const animStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [FULL_REVEAL, 0],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 0.8, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.ctaOuter, animStyle]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.ctaInner, pressed && { opacity: 0.85 }]}
      >
        <LinearGradient
          colors={Gradients.hotStock as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaGradient}
        >
          <Icon name="storefront" size={18} color="onBrand" />
          <View style={styles.ctaTextBlock}>
            <Text style={styles.ctaTitle}>Сравнить</Text>
            {minPriceRub != null ? (
              <Text style={styles.ctaSub} numberOfLines={1}>
                от {formatPrice(Number(minPriceRub))}
                {storesCount && storesCount > 1 ? ` · ${storesCount} маг.` : ''}
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    position: 'relative',
  },

  // ── PEEK TAB (persistent bookmark) ─────────────────────────────────
  peekTab: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PEEK_WIDTH,
    overflow: 'hidden',
    // Тень-glow ember чтобы выделялся на любой обложке
    shadowColor: '#FF7A4A',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  peekGradient: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'space-between',
    // Левый край скруглён чтобы стыковаться с карточкой
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
  },
  peekArrows: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 12,
  },
  peekLabelWrap: {
    // Контейнер для повёрнутого текста. Width/height swapped — после
    // rotate -90deg текст «лёжа» становится «стоя».
    width: 60,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-90deg' }],
  },
  peekLabel: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.4,
    includeFontPadding: false,
  },
  peekBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekBadgeText: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },

  // ── FULL CTA при свайпе ────────────────────────────────────────────
  ctaOuter: {
    width: FULL_REVEAL,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  ctaInner: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  ctaTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  ctaTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  ctaSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
  },
});

export default WishlistListSwipe;
