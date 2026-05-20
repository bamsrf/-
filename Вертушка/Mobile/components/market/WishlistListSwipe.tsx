/**
 * WishlistListSwipe — единый ember-баннер с peek-эффектом для строки вишлиста.
 *
 * Концепция (по запросу юзера, с референс-картинки):
 *   - Баннер всегда виден маленьким язычком справа: вертикальная надпись
 *     «ТЯНИ» + стрелка ← (без плюсиков, без счётчиков — минимализм).
 *   - При свайпе влево баннер ОТЪЕЗЖАЕТ ОТ ПРАВОГО КРАЯ и раскрывается
 *     целиком: storefront-icon + «Купить» + «от X ₽ · N магазинов».
 *   - Когда баннер раскрыт ≥ половины — закрепляется в открытом виде +
 *     открывает bottom-sheet с ценами по тапу.
 *   - Тап на peek (без свайпа) = то же, что полный свайп → bottom-sheet.
 *
 * Реализация на GestureDetector + Reanimated (не ReanimatedSwipeable —
 * чтобы был ПОЛНЫЙ контроль над interpolation peek↔full).
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
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

// Геометрия баннера
const PEEK_WIDTH = 30;       // ширина peek-части (видна в rest)
const FULL_WIDTH = 180;      // ширина баннера, когда полностью раскрыт
const DELTA = FULL_WIDTH - PEEK_WIDTH; // 150 — сколько надо протянуть

const ACTIVE_OFFSET = 12;    // px после которого жест активируется
const FAIL_OFFSET_Y = 14;    // vertical scroll до этого не блокируется

const TEASE_DURATION_MS = 1200; // одноразовая подсказка-анимация

export function WishlistListSwipe({
  children,
  hasOffers,
  minPriceRub,
  storesCount = 0,
  onOpen,
  style,
}: WishlistListSwipeProps) {
  const hasSeenHint = useMarketStore((s) => s.hasSeenSwipeHint);
  const markHintSeen = useMarketStore((s) => s.markSwipeHintSeen);
  const [didTease, setDidTease] = useState(false);

  // offsetX: 0 (closed) → -DELTA (fully open). Banner едет влево.
  const offsetX = useSharedValue(0);
  const startX = useSharedValue(0);

  const triggerOpen = useCallback(() => {
    onOpen();
  }, [onOpen]);

  // One-shot teaser: показываем юзеру что банер можно тянуть.
  useEffect(() => {
    if (!hasOffers || hasSeenHint || didTease) return;
    const t = setTimeout(() => {
      offsetX.value = withTiming(-DELTA * 0.45, { duration: 520, easing: Easing.out(Easing.cubic) });
      setTimeout(() => {
        offsetX.value = withTiming(0, { duration: 360, easing: Easing.in(Easing.cubic) });
        markHintSeen();
        setDidTease(true);
      }, TEASE_DURATION_MS);
    }, 900);
    return () => clearTimeout(t);
  }, [hasOffers, hasSeenHint, didTease, markHintSeen, offsetX]);

  // Pan gesture
  const panGesture = Gesture.Pan()
    .activeOffsetX([-ACTIVE_OFFSET, ACTIVE_OFFSET])
    .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
    .onStart(() => {
      startX.value = offsetX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      // Зажимаем в [-DELTA, 0]. Resistance в overscroll'е (right past 0).
      if (next > 0) {
        offsetX.value = next * 0.15;
      } else if (next < -DELTA) {
        offsetX.value = -DELTA - (next + DELTA) * 0.4;
      } else {
        offsetX.value = next;
      }
    })
    .onEnd((e) => {
      const shouldOpen =
        offsetX.value < -DELTA * 0.45 || e.velocityX < -500;
      if (shouldOpen) {
        // Полный snap влево → задержка → возврат на rest. Полностью на
        // worklet-стороне (withSequence + withDelay) — НЕЛЬЗЯ
        // runOnJS(setTimeout): setTimeout не сериализуется.
        offsetX.value = withSequence(
          withTiming(-DELTA, { duration: 220, easing: Easing.out(Easing.cubic) }),
          withDelay(180, withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) })),
        );
        runOnJS(triggerOpen)();
      } else {
        offsetX.value = withTiming(0, {
          duration: 240,
          easing: Easing.out(Easing.cubic),
        });
      }
    });

  // Карточка НЕ двигается — это требование юзера: «один баннер
  // оттягивается, остальное стоит на месте». Только banner expand'ит
  // leftward.

  // Banner translateX: при rest = +DELTA (банер за экраном на DELTA),
  // при open = 0 (банер на месте). Виден только peek-часть в rest.
  const bannerStyle = useAnimatedStyle(() => {
    // offsetX ∈ [-DELTA, 0]. openness ∈ [0, 1].
    const openness = Math.min(1, Math.max(0, -offsetX.value / DELTA));
    const tx = DELTA * (1 - openness);
    return {
      transform: [{ translateX: tx }],
    };
  });

  // CTA-текстовый блок: opacity растёт по openness
  const fullCtaStyle = useAnimatedStyle(() => {
    const openness = Math.min(1, Math.max(0, -offsetX.value / DELTA));
    return {
      opacity: interpolate(openness, [0, 0.55, 1], [0, 0.4, 1], Extrapolation.CLAMP),
    };
  });

  // Peek-текст: opacity = 1 в rest, тает по мере раскрытия (потому что
  // банер всё равно виден целиком, peek сливается с full).
  const peekStyle = useAnimatedStyle(() => {
    const openness = Math.min(1, Math.max(0, -offsetX.value / DELTA));
    return {
      opacity: interpolate(openness, [0, 0.5], [1, 0], Extrapolation.CLAMP),
    };
  });

  if (!hasOffers) {
    return <View style={style}>{children}</View>;
  }

  return (
    <View style={[styles.rowWrap, style]}>
      {/* Карточка статична — баннер expand'ит поверх неё */}
      <GestureDetector gesture={panGesture}>
        <View style={{ paddingRight: PEEK_WIDTH }}>
          {children}
        </View>
      </GestureDetector>

      {/* Единый ember-баннер. Абсолютный, right=0, width=FULL_WIDTH.
          На rest сдвинут на DELTA вправо → виден только PEEK_WIDTH (правый
          край с вертикальной «ТЯНИ»). На open сдвинут до 0 → виден целиком
          с «Купить» CTA. */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.bannerWrap, bannerStyle]}
      >
        <Pressable
          onPress={triggerOpen}
          accessibilityRole="button"
          accessibilityLabel={
            minPriceRub
              ? `Сравнить цены: от ${minPriceRub} рублей в ${storesCount} магазинах`
              : 'Сравнить цены'
          }
          style={styles.bannerPressable}
        >
          <LinearGradient
            colors={Gradients.hotStock as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.bannerGradient}
          >
            {/* FULL CTA: появляется по мере раскрытия */}
            <Animated.View style={[styles.fullCtaBlock, fullCtaStyle]}>
              <Icon name="storefront" size={18} color="onBrand" />
              <View style={styles.fullCtaText}>
                <Text style={styles.fullCtaTitle}>Купить</Text>
                {minPriceRub != null ? (
                  <Text style={styles.fullCtaSub} numberOfLines={1}>
                    от {formatPrice(Number(minPriceRub))}
                    {storesCount > 1 ? ` · ${storesCount} маг.` : ''}
                  </Text>
                ) : null}
              </View>
            </Animated.View>

            {/* PEEK: вертикальная «ТЯНИ» + стрелка ←. Видна в rest состоянии. */}
            <Animated.View style={[styles.peekBlock, peekStyle]} pointerEvents="none">
              <Icon name="chevron-left" size={11} color="onBrand" />
              <View style={styles.peekLabelWrap}>
                <Text style={styles.peekLabel}>ТЯНИ</Text>
              </View>
            </Animated.View>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    position: 'relative',
    overflow: 'hidden',
  },

  // Сам баннер: абсолют, right:0, width=FULL_WIDTH
  bannerWrap: {
    position: 'absolute',
    right: 0,
    top: 4,
    bottom: 4,
    width: FULL_WIDTH,
    // glow ember чтобы выделялся даже на светлой обложке
    shadowColor: '#FF7A4A',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  bannerPressable: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  // FULL CTA блок (storefront + Купить + price). Растёт по openness.
  fullCtaBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  fullCtaText: {
    flex: 1,
    minWidth: 0,
  },
  fullCtaTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
    includeFontPadding: false,
  },
  fullCtaSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
    includeFontPadding: false,
  },

  // PEEK-блок: на правом краю, вертикальная «ТЯНИ» + chevron-left.
  // Width = PEEK_WIDTH; absolute правый край.
  peekBlock: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: PEEK_WIDTH,
    alignItems: 'center',
    justifyContent: 'space-around',
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
});

export default WishlistListSwipe;
