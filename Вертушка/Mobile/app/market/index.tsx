/**
 * /market — отдельный standalone-экран Маркета.
 *
 * Открывается напрямую через OffersBlock CTA «Нажми и посмотри, что ещё
 * есть в наличии» на детальной записи. Юзер раньше попадал в /(tabs)/search
 * с auto-scroll к Маркет-секции — что давало визуальный flash «сначала
 * Поиск, потом проскролл». Теперь — сразу dark market-background и
 * MarketSection в полную высоту.
 *
 * Состав: MarketBackground (forcedMode='market') + back-arrow + MarketSection
 * + опциональная search-результатная сетка.
 *
 * Источник: docs/plans/MARKET_AND_PRICE_DRAWER.md §1.1.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';

import { Icon } from '../../components/ui';
import { api } from '../../lib/api';
import { MarketPalette } from '../../constants/theme';
import type {
  MarketFormatFilter,
  MarketSearchItem,
  MarketStoreInfo,
} from '../../lib/types';

import MarketBackground from '../../components/market/MarketBackground';
import MarketSection, { type MarketStoreData } from '../../components/market/MarketSection';
import MarketSearchResults from '../../components/market/MarketSearchResults';

export default function MarketIndexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Stores + per-store carousels — те же ручки что в (tabs)/search.tsx
  const [marketStores, setMarketStores] = useState<MarketStoreData[]>([]);
  const [marketSearch, setMarketSearch] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [marketFormatFilter, setMarketFormatFilter] = useState<MarketFormatFilter | 'all'>('all');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setDebouncedQuery(marketSearch.trim());
    }, 400);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [marketSearch]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stores = await api.getMarketStores(1);
        const carousels: (MarketStoreData | null)[] = await Promise.all(
          stores.map(async (store) => {
            try {
              const items = await api.getStoreListings(store.slug, { limit: 15, sort: 'newest' });
              return {
                slug: store.slug,
                name: store.name,
                totalCount: store.in_stock_count,
                items: items.map((it) => ({
                  id: it.record_id,
                  artist: it.artist,
                  title: it.title,
                  year: it.year ?? null,
                  format: it.format_type ?? null,
                  coverUrl: it.cover_image_url ?? null,
                  priceRub: Number(it.min_price_rub),
                })),
              } as MarketStoreData;
            } catch { return null; }
          }),
        );
        if (!cancelled) {
          setMarketStores(carousels.filter((c): c is MarketStoreData => c !== null && c.items.length > 0));
        }
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, []);

  // Search в Маркете (после ввода или выбора format-фильтра)
  const [searchItems, setSearchItems] = useState<MarketSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const isSearchActive = useMemo(() => {
    return debouncedQuery.length >= 2 || marketFormatFilter !== 'all';
  }, [debouncedQuery, marketFormatFilter]);

  useEffect(() => {
    if (!isSearchActive) {
      setSearchItems([]);
      setSearchLoading(false);
      return;
    }
    let cancelled = false;
    setSearchLoading(true);
    api.searchMarket({
      q: debouncedQuery.length >= 2 ? debouncedQuery : undefined,
      format: marketFormatFilter === 'all' ? null : marketFormatFilter,
      sort: 'price_asc',
      limit: 50,
    })
      .then((res) => { if (!cancelled) setSearchItems(res); })
      .catch(() => { if (!cancelled) setSearchItems([]); })
      .finally(() => { if (!cancelled) setSearchLoading(false); });
    return () => { cancelled = true; };
  }, [isSearchActive, debouncedQuery, marketFormatFilter]);

  const handleStorePress = useCallback((slug: string) => {
    router.push(`/market/store/${slug}` as any);
  }, [router]);
  const handleItemPress = useCallback((item: { id: string }) => {
    router.push(`/record/${item.id}` as any);
  }, [router]);
  const handleSearchItemPress = useCallback((item: MarketSearchItem) => {
    router.push(`/record/${item.discogs_id ?? item.record_id}` as any);
  }, [router]);

  return (
    <View style={styles.root}>
      <MarketBackground forcedMode="market" />

      {/* Top safe-area blur (как в /market/store/[slug]) */}
      <BlurView
        intensity={28}
        tint="dark"
        style={[styles.topSafeBlur, { height: insets.top + 44 }]}
        pointerEvents="none"
      />

      {/* Back-arrow */}
      <Pressable
        onPress={() => router.back()}
        style={[styles.backBtn, { top: insets.top + 6 }]}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Icon name="caret-left" size={20} color="onBrand" />
      </Pressable>

      <FlatList
        data={[]}
        keyExtractor={() => ''}
        renderItem={null as any}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        ListHeaderComponent={
          <View style={{ paddingTop: insets.top + 16 }}>
            {marketStores.length > 0 && (
              <MarketSection
                stores={isSearchActive ? [] : marketStores}
                searchValue={marketSearch}
                onSearchChange={setMarketSearch}
                formatFilter={marketFormatFilter}
                onFormatChange={setMarketFormatFilter}
                totalStores={marketStores.length}
                totalItems={marketStores.reduce((sum, s) => sum + s.totalCount, 0)}
                onStorePress={handleStorePress}
                onItemPress={(item) => handleItemPress(item)}
                headerPaddingTop={20}
              />
            )}
            {marketStores.length > 0 && isSearchActive && (
              <MarketSearchResults
                loading={searchLoading}
                query={marketSearch}
                items={searchItems}
                onItemPress={handleSearchItemPress}
              />
            )}
            {marketStores.length === 0 && (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  Магазины ещё не подключены или временно недоступны
                </Text>
              </View>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: MarketPalette.void,
  },
  topSafeBlur: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 30,
    backgroundColor: 'rgba(14,7,38,0.45)',
  },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 40,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    paddingHorizontal: 32,
    paddingVertical: 80,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
  },
});
