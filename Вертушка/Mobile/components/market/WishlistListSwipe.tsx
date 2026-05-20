/**
 * WishlistListSwipe — единый ember-баннер, прибитый к правому краю.
 *
 * Архитектура (по итоговому согласованию с юзером):
 *
 *   ┌──────────────────────────────┬─────────┐
 *   │ Card content                 │ ← ТЯНИ │   ← peek-зона ВСЕГДА видна,
 *   │ (двигается влево при свайпе) │         │     находится в одном с CTA
 *   └──────────────────────────────┴─────────┘     gradient'е.
 *                                  ↑
 *                                  Banner: ОДИН gradient-view, прибит right:0.
 *                                  При rest width = PEEK_WIDTH.
 *                                  При свайпе влево width РАСТЁТ leftward —
 *                                  появляется «Купить · от X ₽ · N маг.»
 *                                  слева от корешка. Это ОДНА непрерывная
 *                                  плашка.
 *
 * Карточка движется с пальцем (translateX = dragX), баннер расширяется
 * leftward синхронно (width = PEEK + |dragX|). Один gesture, одна
 * SharedValue, два связанных visual'а.
 *
 * Без ReanimatedSwipeable — он не умеет render'ить ОДИН непрерывный
 * элемент через peek + reveal. Делаем напрямую через Gesture.Pan +
 * Reanimated.
 *
 * Тригеры (оба → onOpen):
 *   - Тап на баннер (peek в rest или CTA в full)
 *   - Свайп ≥ 45% / velocity < -500 — auto-snap к full + onOpen +
 *     возврат на rest через 180ms.
 */
import React, { useCallback, useEffect, useState } from 'react';
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

const PEEK_WIDTH = 40;       // ширина корешка (увеличена с 32 — Cyrillic ExtraBold глифы требуют простора)
const FULL_WIDTH = 168;      // полная ширина баннера в open (peek + CTA)
const DELTA = FULL_WIDTH - PEEK_WIDTH; // 136 — сколько надо протянуть

const ACTIVE_OFFSET = 12;
const FAIL_OFFSET_Y = 14;
const TEASE_DURATION_MS = 1100;

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

  // dragX: 0 (rest) → -DELTA (full open). Двигает И карточку И баннер.
  const dragX = useSharedValue(0);
  const startX = useSharedValue(0);

  const triggerOpen = useCallback(() => {
    onOpen();
  }, [onOpen]);

  // One-shot teaser: показываем юзеру что баннер можно тянуть.
  useEffect(() => {
    if (!hasOffers || hasSeenHint || didTease) return;
    const t = setTimeout(() => {
      dragX.value = withSequence(
        withTiming(-DELTA * 0.45, { duration: 520, easing: Easing.out(Easing.cubic) }),
        withDelay(TEASE_DURATION_MS, withTiming(0, { duration: 360, easing: Easing.in(Easing.cubic) })),
      );
      setTimeout(() => {
        markHintSeen();
        setDidTease(true);
      }, TEASE_DURATION_MS + 520 + 360);
    }, 900);
    return () => clearTimeout(t);
  }, [hasOffers, hasSeenHint, didTease, markHintSeen, dragX]);

  // Pan gesture
  const panGesture = Gesture.Pan()
    .activeOffsetX([-ACTIVE_OFFSET, ACTIVE_OFFSET])
    .failOffsetY([-FAIL_OFFSET_Y, FAIL_OFFSET_Y])
    .onStart(() => {
      startX.value = dragX.value;
    })
    .onUpdate((e) => {
      const next = startX.value + e.translationX;
      // Clamp [-DELTA, 0] с elastic overscroll
      if (next > 0) {
        dragX.value = next * 0.15;
      } else if (next < -DELTA) {
        dragX.value = -DELTA - (next + DELTA) * 0.4;
      } else {
        dragX.value = next;
      }
    })
    .onEnd((e) => {
      const shouldOpen = dragX.value < -DELTA * 0.45 || e.velocityX < -500;
      if (shouldOpen) {
        dragX.value = withSequence(
          withTiming(-DELTA, { duration: 200, easing: Easing.out(Easing.cubic) }),
          withDelay(180, withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) })),
        );
        runOnJS(triggerOpen)();
      } else {
        dragX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      }
    });

  // КАРТОЧКА — двигается с пальцем (translateX = dragX напрямую)
  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }],
  }));

  // БАННЕР — width = PEEK + |dragX|. Прибит right:0, растёт leftward.
  const bannerStyle = useAnimatedStyle(() => {
    const w = PEEK_WIDTH + Math.min(DELTA, Math.max(0, -dragX.value));
    return { width: w };
  });

  // CTA «Купить» — opacity fade in по мере раскрытия баннера
  const ctaStyle = useAnimatedStyle(() => {
    const openness = Math.min(1, Math.max(0, -dragX.value / DELTA));
    return {
      opacity: interpolate(openness, [0, 0.55, 1], [0, 0.4, 1], Extrapolation.CLAMP),
    };
  });

  if (!hasOffers) {
    return <View style={style}>{children}</View>;
  }

  return (
    // GestureDetector ОБОРАЧИВАЕТ ВСЁ — и карточку и баннер. Иначе если
    // палец стартует с баннера справа, gesture не ловится (раньше был
    // только над карточкой).
    <GestureDetector gesture={panGesture}>
      <View style={[styles.rowWrap, style]}>
        {/* КАРТОЧКА — двигается влево с пальцем. paddingRight под peek. */}
        <Animated.View style={[{ paddingRight: PEEK_WIDTH }, cardStyle]}>
          {children}
        </Animated.View>

        {/* ОДИН gradient-баннер. Прибит к right:0. Width растёт leftward.
            pointerEvents=box-none — тапы проходят на Pressable внутри,
            но drag-жесты bubble up к parent'у GestureDetector. */}
        <Animated.View
          pointerEvents="box-none"
          style={[styles.bannerWrap, bannerStyle]}
        >
          <Pressable
            onPress={triggerOpen}
            accessibilityRole="button"
            accessibilityLabel={
              minPriceRub
                ? `Купить: от ${minPriceRub} рублей в ${storesCount} магазинах`
                : 'Открыть цены'
            }
            style={styles.bannerPressable}
          >
            <LinearGradient
              colors={Gradients.hotStock as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerGradient}
            >
              {/* CTA "Купить" — слева от корешка, fade in по openness */}
              <Animated.View style={[styles.ctaZone, ctaStyle]}>
                <Icon name="storefront" size={18} color="onBrand" />
                <View style={styles.ctaTextBlock}>
                  <Text style={styles.ctaTitle} numberOfLines={1}>Купить</Text>
                  {minPriceRub != null ? (
                    <Text style={styles.ctaSub} numberOfLines={1}>
                      от {formatPrice(Number(minPriceRub))}
                      {storesCount > 1 ? ` · ${storesCount} маг.` : ''}
                    </Text>
                  ) : null}
                </View>
              </Animated.View>

              {/* PEEK (корешок) — ← и вертикальная ТЯНИ. */}
              <View style={styles.peekZone} pointerEvents="none">
                <View style={styles.peekArrow}>
                  <Icon name="caret-left" size={14} color="onBrand" />
                </View>
                {/* Каждая буква в своём contained View фиксированной ширины.
                    Cyrillic ExtraBold глифы визуально ШИРЕ своего layout box —
                    без explicit width Text обрезает их по своей коробке.
                    width:20 + textAlign:center даёт глифу простор. */}
                <View style={styles.peekStack}>
                  {'ТЯНИ'.split('').map((ch, i) => (
                    <View key={i} style={styles.peekCharBox}>
                      <Text style={styles.peekChar}>{ch}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  rowWrap: {
    position: 'relative',
    // overflow: 'hidden' УБРАН — banner абсолютный right:0 в rowWrap,
    // он ВНУТРИ границ rowWrap'а (его width ≤ rowWrap.width), overflow
    // не нужен и потенциально клипал глифы.
  },

  // ── ЕДИНЫЙ БАННЕР ────────────────────────────────────────────────
  bannerWrap: {
    position: 'absolute',
    right: 0,
    // top:0 — выравнен с верхом white card.
    // bottom:8 — выравнен с низом card (card имеет marginBottom:Spacing.sm=8
    // внутри rowWrap'а, banner должен заканчиваться вместе с белой плашкой).
    top: 0,
    bottom: 8,
    // Glow только slight, чтобы не создавать halo выше/ниже banner'а
    // (юзер видел это как «banner больше карточки»). shadowRadius уменьшен
    // с 8 до 4. Halo маленький, помогает отделить banner от карточки
    // без визуального оверсайза.
    shadowColor: '#FF7A4A',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  bannerPressable: {
    flex: 1,
    // borderRadius на самом Pressable УБРАН — LinearGradient внутри
    // на iOS не всегда уважает overflow:hidden родителя. Ставим radius
    // прямо на gradient.
  },
  // borderRadius прямо на LinearGradient. Square right edges (pull-tab
  // приклеен к правому краю экрана), скруглённые левые.
  bannerGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    overflow: 'hidden',
  },

  // CTA «Купить» — flex:1 (занимает всё пространство left от peek-зоны).
  // overflow:hidden у parent banner'а — текст не торчит при узком rest.
  ctaZone: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 12,
    paddingRight: 4,
    minWidth: 0,
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
    includeFontPadding: false,
  },
  ctaSub: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
    includeFontPadding: false,
  },

  // PEEK-зона — корешок справа. Фиксированная ширина, всегда видна.
  // justifyContent:center — content вертикально по середине банера
  // (=по центру текста карточки слева). Раньше был flex-start +
  // paddingTop, но banner теперь правильно выравнен по карточке,
  // правый край square (borderRadius:0) → arrow не клипается.
  peekZone: {
    width: PEEK_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 6,
  },
  peekArrow: {},
  peekStack: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  // Каждая буква в фиксированном 20×12 контейнере. Без этого Cyrillic
  // ExtraBold глифы клипались своим natural-width Text-view'ом.
  peekCharBox: {
    width: 20,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peekChar: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0,
    includeFontPadding: false,
    textAlign: 'center',
    // width на тексте чтобы render-area хватало для wide-glyph'ов
    width: 20,
  },
});

export default WishlistListSwipe;
