/**
 * StickyMarketHeader — прибитый «МАРКЕТ» поверх FlatList'а в search.tsx.
 *
 * Появляется когда юзер пересёк marketSectionY (driven by SharedValue
 * opacity-prop). Заменяет hero-заголовок Маркета в скролле: hero уезжает
 * наверх вместе со скроллом, а sticky-overlay zafix'ен.
 *
 * Геометрия: 110dp height (54 safe-area + 56 content) — full BlurView
 * tint=dark на market-фоне.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MarketHeader from './MarketHeader';

interface StickyMarketHeaderProps {
  /** SharedValue 0..1 управляющий видимостью overlay'а. */
  opacity: SharedValue<number>;
  onSearchPress?: () => void;
}

export function StickyMarketHeader({ opacity, onSearchPress }: StickyMarketHeaderProps) {
  const insets = useSafeAreaInsets();
  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.container, animStyle]}
    >
      <BlurView
        intensity={28}
        tint="dark"
        style={[styles.blur, { paddingTop: insets.top }]}
      >
        <MarketHeader
          mode="sticky"
          paddingTop={0}
          onSearchPress={onSearchPress}
        />
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
  },
  blur: {
    backgroundColor: 'rgba(14,7,38,0.55)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
});

export default StickyMarketHeader;
