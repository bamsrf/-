/**
 * WishlistListSwipe — лёгкий swipe-wrapper для строк вишлиста (list mode).
 *
 * Идея пользователя: при горизонтальном свайпе влево показывается «карман»
 * с CTA, как в Telegram (silent messages / unread / pin). Тап на CTA →
 * детальная запись где живёт OffersBlock (стилизованный под Маркет).
 *
 * Если для записи нет офферов в наличии (hasOffers=false) — рендерим
 * детей напрямую без gesture-обёртки. Иначе бесполезные язычки на каждой
 * строке вишлиста.
 *
 * Pulse-подсказку показываем ОДИН РАЗ на первой строке за сессию
 * (через useMarketStore.hasSeenSwipeHint).
 *
 * Источник: WishlistRowWithOffers + MARKET_AND_PRICE_DRAWER.md §2.1
 *           (упрощённая версия — без inline drawer, без top-3 загрузки).
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
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { Icon } from '../ui';
import { Gradients } from '../../constants/theme';
import { useMarketStore } from '../../lib/marketStore';

interface WishlistListSwipeProps {
  /** Карточка пластинки. */
  children: React.ReactNode;
  /** Есть ли офферы в наличии. false → рендерим children без swipe. */
  hasOffers: boolean;
  /** Минимальная цена для подписи под CTA. Если null — не пишем. */
  minPriceRub?: number | null;
  /** Сколько магазинов с in_stock — для подписи. */
  storesCount?: number;
  /** Тап на reveal-CTA. Обычно navigation к /record/[id]. */
  onCTAPress: () => void;
  style?: StyleProp<ViewStyle>;
}

const CTA_WIDTH = 132;
const PULSE_DURATION_MS = 1400;

export function WishlistListSwipe({
  children,
  hasOffers,
  minPriceRub,
  storesCount,
  onCTAPress,
  style,
}: WishlistListSwipeProps) {
  const swipeableRef = useRef<SwipeableMethods>(null);
  const hasSeenHint = useMarketStore((s) => s.hasSeenSwipeHint);
  const markHintSeen = useMarketStore((s) => s.markSwipeHintSeen);
  const [didPulse, setDidPulse] = useState(false);

  // Анимация-подсказка: открыть на 60px → закрыть через 1.2s, один раз
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

  const renderCTA = () => (
    <Pressable
      style={styles.ctaWrap}
      onPress={() => {
        swipeableRef.current?.close();
        onCTAPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={
        minPriceRub
          ? `Открыть детальную: цены от ${minPriceRub} рублей`
          : 'Открыть детальную записи и посмотреть цены'
      }
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
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderCTA}
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={style}
    >
      <View style={styles.contentWrap}>{children}</View>
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    position: 'relative',
  },
  ctaWrap: {
    width: CTA_WIDTH,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  ctaGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
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
