/**
 * WishlistListSwipe — swipe-row с peek-корешком и полным CTA reveal.
 *
 * Концепция (по запросу юзера):
 *   - На правом краю карточки прибит узкий ember-«корешок»:
 *     вертикально «ТЯНИ» + стрелочка ← (минимализм, без плюсиков/счётчиков).
 *   - Корешок — часть КАРТОЧКИ, двигается с ней при свайпе.
 *   - Когда юзер свайпает влево, карточка с корешком уезжает влево,
 *     и из-под неё выезжает full CTA-баннер «Купить · от X ₽ · N маг.»
 *   - При полном свайпе → onOpen() (BottomSheet с офферами).
 *
 * На ReanimatedSwipeable:
 *   - children = карточка + peek-корешок (он часть children'а)
 *   - renderRightActions = full CTA reveal
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

const PEEK_WIDTH = 28;       // ширина корешка на правом краю карточки
const FULL_WIDTH = 158;      // ширина full CTA при свайпе
const TEASE_DURATION_MS = 1100;

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
  const [didTease, setDidTease] = useState(false);

  // One-shot teaser: показываем что строку можно тянуть.
  useEffect(() => {
    if (!hasOffers || hasSeenHint || didTease) return;
    const t = setTimeout(() => {
      swipeableRef.current?.openRight();
      setTimeout(() => {
        swipeableRef.current?.close();
        markHintSeen();
        setDidTease(true);
      }, TEASE_DURATION_MS);
    }, 900);
    return () => clearTimeout(t);
  }, [hasOffers, hasSeenHint, didTease, markHintSeen]);

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
      rightThreshold={FULL_WIDTH * 0.5}
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
        {/* Карточка получает right padding чтобы текст не наезжал на корешок */}
        <View style={{ paddingRight: PEEK_WIDTH }}>
          {children}
        </View>

        {/* Корешок справа: вертикальная ТЯНИ + chevron-left.
            Часть карточки (двигается вместе с ней при свайпе).
            Тап = открыть bottom-sheet (то же что свайп). */}
        <Pressable
          style={styles.peekSpine}
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
            <Icon name="chevron-left" size={11} color="onBrand" />
            <View style={styles.peekLabelWrap}>
              <Text style={styles.peekLabel}>ТЯНИ</Text>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
    </ReanimatedSwipeable>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Full CTA — выезжает из-под карточки при свайпе

interface FullCTARevealProps {
  progress: SharedValue<number>;
  minPriceRub?: number | null;
  storesCount?: number;
  onPress: () => void;
}

function FullCTAReveal({ progress, minPriceRub, storesCount = 0, onPress }: FullCTARevealProps) {
  const animStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [FULL_WIDTH, 0],
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
            <Text style={styles.ctaTitle}>Купить</Text>
            {minPriceRub != null ? (
              <Text style={styles.ctaSub} numberOfLines={1}>
                от {formatPrice(Number(minPriceRub))}
                {storesCount > 1 ? ` · ${storesCount} маг.` : ''}
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

  // ── PEEK-КОРЕШОК (часть карточки, едет с ней при свайпе) ──────────
  peekSpine: {
    position: 'absolute',
    right: 0,
    top: 4,
    bottom: 4,
    width: PEEK_WIDTH,
    borderRadius: 14,
    overflow: 'hidden',
    // glow ember чтобы выделялся на любой обложке
    shadowColor: '#FF7A4A',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  peekGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  peekLabelWrap: {
    width: 50,
    height: 14,
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

  // ── FULL CTA REVEAL (выезжает из-под карточки) ────────────────────
  ctaOuter: {
    width: FULL_WIDTH,
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
