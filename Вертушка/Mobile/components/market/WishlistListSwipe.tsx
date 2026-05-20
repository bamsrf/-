/**
 * WishlistListSwipe — swipe-wrapper для строк вишлиста (list mode).
 *
 * Концепция: палец тянет строку влево → CTA «К ценам» плавно ВЫЕЗЖАЕТ из-за
 * правого края экрана, следуя за пальцем. При полном свайпе → автоматически
 * открывается BottomSheet с топ-3 ценами + ссылкой «Все варианты».
 *
 * Анимация slide-in реализована через `renderRightActions(progress, dragX)` —
 * мы интерполируем translateX от width до 0 по `progress` (0..1 при свайпе).
 * Это и есть «плавно сбоку подтягивается» как просил юзер.
 *
 * Pulse-подсказка играет ОДИН РАЗ за сессию на первой строке с офферами
 * (через useMarketStore.hasSeenSwipeHint).
 *
 * Источник: WishlistRowWithOffers + MARKET_AND_PRICE_DRAWER.md §2.1.
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
  /** Есть ли офферы в наличии. false → рендерим children без swipe. */
  hasOffers: boolean;
  minPriceRub?: number | null;
  storesCount?: number;
  /**
   * Колбэк при полном открытии swipe (right-side reveal завершён).
   * Здесь родитель должен открыть BottomSheet с ценами.
   * НЕ navigation — сам swipe = действие.
   */
  onOpen: () => void;
  style?: StyleProp<ViewStyle>;
}

const CTA_WIDTH = 132;
const PULSE_DURATION_MS = 1400;

export function WishlistListSwipe({
  children,
  hasOffers,
  minPriceRub,
  storesCount,
  onOpen,
  style,
}: WishlistListSwipeProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const hasSeenHint = useMarketStore((s) => s.hasSeenSwipeHint);
  const markHintSeen = useMarketStore((s) => s.markSwipeHintSeen);
  const [didPulse, setDidPulse] = useState(false);

  // Анимация-подсказка: один раз за сессию открываем на ~60% → закрываем
  useEffect(() => {
    if (!hasOffers || hasSeenHint || didPulse) return;
    const t = setTimeout(() => {
      swipeableRef.current?.openRight();
      setTimeout(() => {
        swipeableRef.current?.close();
        markHintSeen();
        setDidPulse(true);
      }, PULSE_DURATION_MS);
    }, 1000);
    return () => clearTimeout(t);
  }, [hasOffers, hasSeenHint, didPulse, markHintSeen]);

  if (!hasOffers) {
    return <View style={style}>{children}</View>;
  }

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={(progress) => (
        <CTAReveal
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
      rightThreshold={CTA_WIDTH * 0.55}
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
      <View style={styles.contentWrap}>
        {children}
        {/* Постоянная подсказка-чип на правом краю строки. Юзер должен
            видеть «зацепку» — что свайп влево что-то откроет. Без неё
            никто не догадается, что строка кликабельна вбок.
            pointerEvents=none — тап проваливается на строку (опен detail).
            При свайпе строка уезжает, и чип уезжает вместе с ней;
            под низом проявляется CTAReveal (тот же gradient). */}
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            onOpen();
          }}
          style={styles.affordancePill}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel={
            minPriceRub
              ? `Открыть цены: от ${minPriceRub} рублей`
              : 'Открыть цены'
          }
        >
          <LinearGradient
            colors={Gradients.hotStock as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.affordancePillGradient}
          >
            <Icon name="disc" size={11} color="onBrand" weight="duotone" />
            {minPriceRub != null ? (
              <Text style={styles.affordancePrice}>
                {formatPrice(Number(minPriceRub))}
              </Text>
            ) : null}
          </LinearGradient>
        </Pressable>
      </View>
    </ReanimatedSwipeable>
  );
}

// ────────────────────────────────────────────────────────────────────────

interface CTARevealProps {
  progress: SharedValue<number>;
  minPriceRub?: number | null;
  storesCount?: number;
  onPress: () => void;
}

/**
 * Reveal-карточка: translateX driven by progress (0 = off-screen-right, 1 = на месте).
 * Так CTA визуально «вытягивается» из-под правой строки. Без этого
 * ReanimatedSwipeable показывает renderRightActions через flex-reveal, что
 * выглядит как «появилась на месте» — что и не понравилось юзеру.
 */
function CTAReveal({ progress, minPriceRub, storesCount, onPress }: CTARevealProps) {
  const animStyle = useAnimatedStyle(() => {
    // 0 → +CTA_WIDTH (за экраном), 1 → 0 (на месте)
    const translateX = interpolate(
      progress.value,
      [0, 1],
      [CTA_WIDTH, 0],
      Extrapolation.CLAMP,
    );
    // Лёгкое замыкание opacity и scale — добавляет «массы» движению
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 0.8, 1], Extrapolation.CLAMP);
    const scale = interpolate(progress.value, [0, 1], [0.92, 1], Extrapolation.CLAMP);
    return {
      transform: [{ translateX }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.ctaOuter, animStyle]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={
          minPriceRub
            ? `Открыть цены: от ${minPriceRub} рублей`
            : 'Открыть цены'
        }
        style={({ pressed }) => [styles.ctaInner, pressed && { opacity: 0.85 }]}
      >
        <LinearGradient
          colors={Gradients.hotStock as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.ctaGradient}
        >
          <Icon name="storefront" size={20} color="onBrand" />
          <View style={styles.ctaTextBlock}>
            <Text style={styles.ctaTitle}>К ценам</Text>
            {minPriceRub != null ? (
              <Text style={styles.ctaSub} numberOfLines={1}>
                от {Math.round(minPriceRub).toLocaleString('ru-RU')} ₽
                {storesCount && storesCount > 1 ? ` · ${storesCount} маг.` : ''}
              </Text>
            ) : storesCount && storesCount >= 1 ? (
              <Text style={styles.ctaSub} numberOfLines={1}>
                {storesCount} маг.
              </Text>
            ) : null}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    position: 'relative',
  },
  // Affordance pill: всегда виден на правом краю строки. Юзер видит
  // disc + price → понимает что свайп влево откроет полный sheet с ценами.
  affordancePill: {
    position: 'absolute',
    right: 8,
    top: '50%',
    marginTop: -14, // half height
    height: 28,
    borderRadius: 9999,
    overflow: 'hidden',
    // glow ember чтобы pill выделялся даже на жёстком фоне
    shadowColor: '#FF7A4A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 4,
  },
  affordancePillGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  affordancePrice: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
  ctaOuter: {
    width: CTA_WIDTH,
    paddingLeft: 8,
    paddingVertical: 4,
    // overflow hidden внутри inner-Pressable
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
