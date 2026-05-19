/**
 * Блок «Где купить» на экране записи.
 *
 * Стилизован под Маркет: тёмный фон (MarketPalette.void) с тонким ember-glow,
 * белая типографика, gradient border. Визуально склеивает детальный экран
 * с Маркетом — юзер видит «карман маркета» внутри детали.
 *
 * Дёргает /api/records/{discogs_id}/offers, показывает карточки магазинов
 * с ценой и кнопкой «Купить». При тапе открывает URL магазина (Linking).
 *
 * Состояния: loading (спиннер) / empty (тихо ничего не рендерим) / error (компакт).
 *
 * CTA: «Что ещё есть в наличии у {магазин} →» (одна большая плашка с
 * gradient bg, ведёт в /market/store/{slug}); для нескольких магазинов —
 * мини-плитки магазинов.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { Icon } from './ui';
import { api } from '../lib/api';
import { analytics } from '../lib/analytics';
import { Offer } from '../lib/types';
import { Typography, Spacing, BorderRadius, MarketPalette, Gradients } from '../constants/theme';
import StoreLogo from './market/StoreLogo';

interface OffersBlockProps {
  discogsId: string;
}

export function OffersBlock({ discogsId }: OffersBlockProps) {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Уникальные магазины из текущих offers — для кнопок «Что ещё в наличии».
  const storeButtons = useMemo(() => {
    if (!offers || offers.length === 0) return [];
    const seen = new Set<string>();
    const result: { slug: string; name: string }[] = [];
    for (const o of offers) {
      if (!seen.has(o.store.slug)) {
        seen.add(o.store.slug);
        result.push({ slug: o.store.slug, name: o.store.name });
      }
    }
    return result;
  }, [offers]);

  useEffect(() => {
    let alive = true;
    setOffers(null);
    setError(null);
    api
      .getRecordOffers(discogsId, 'price')
      .then((data) => {
        if (!alive) return;
        setOffers(data);
        analytics.viewOffers(discogsId, data.length);
      })
      .catch((e) => {
        if (!alive) return;
        setError(String(e?.message ?? 'Не удалось загрузить предложения'));
      });
    return () => {
      alive = false;
    };
  }, [discogsId]);

  // Loading: компактный скелет
  if (offers === null && !error) {
    return (
      <View style={styles.shell}>
        <Text style={styles.title}>Купить сейчас</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FFD9C8" />
        </View>
      </View>
    );
  }

  // Empty: тихо ничего не рендерим — детальная не должна торчать пустой плашкой
  if (!error && offers !== null && offers.length === 0) {
    return null;
  }

  // Error: компактная плашка
  if (error) {
    return (
      <View style={styles.shell}>
        <Text style={styles.title}>Купить сейчас</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Купить сейчас</Text>
        <View style={styles.headerBadge}>
          <Icon name="disc" size={10} color="onBrand" style={{ opacity: 0.85 }} />
          <Text style={styles.headerBadgeText}>{offers!.length} в наличии</Text>
        </View>
      </View>

      <View style={styles.list}>
        {offers!.map((offer) => (
          <OfferRow key={offer.listing_id} offer={offer} discogsId={discogsId} />
        ))}
      </View>

      <Text style={styles.disclaimer}>
        Цены и наличие — со страниц магазинов, обновляются ежедневно.
      </Text>

      {/* Точка входа в Маркет.
          1 магазин → одна большая «открой ящик» плашка с gradient.
          ≥2     → мини-плитки магазинов в столбик. */}
      {storeButtons.length === 1 && (
        <Pressable
          onPress={() => router.push(`/market/store/${storeButtons[0].slug}` as any)}
          accessibilityRole="button"
          accessibilityLabel={`Открыть витрину ${storeButtons[0].name} в Маркете`}
          style={({ pressed }) => [styles.marketEntryWrap, pressed && { opacity: 0.85 }]}
        >
          <LinearGradient
            colors={Gradients.hotStock as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.marketEntryGradient}
          >
            <StoreLogo slug={storeButtons[0].slug} size={40} radius={9} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.marketEntryEyebrow} numberOfLines={1}>
                В МАРКЕТЕ · {storeButtons[0].name.toUpperCase()}
              </Text>
              <Text style={styles.marketEntryTitle} numberOfLines={2}>
                Нажми и посмотри, что ещё привезли
              </Text>
            </View>
            <View style={styles.marketEntryArrowCircle}>
              <Icon name="arrow-right" size={16} color="onBrand" />
            </View>
          </LinearGradient>
        </Pressable>
      )}
      {storeButtons.length > 1 && (
        <View style={styles.multiBlock}>
          <Text style={styles.multiBlockTitle}>
            Нажми, чтобы посмотреть что ещё есть
          </Text>
          {storeButtons.map((s) => (
            <Pressable
              key={s.slug}
              onPress={() => router.push(`/market/store/${s.slug}` as any)}
              style={({ pressed }) => [
                styles.marketEntryMultiBtn,
                pressed && { opacity: 0.75 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Открыть витрину ${s.name} в Маркете`}
            >
              <StoreLogo slug={s.slug} size={32} radius={7} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.marketEntryMultiName} numberOfLines={1}>
                  {s.name}
                </Text>
                <Text style={styles.marketEntryMultiSub} numberOfLines={1}>
                  Открыть витрину магазина →
                </Text>
              </View>
              <Icon name="arrow-right" size={14} color="onBrand" style={{ opacity: 0.7 }} />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

interface OfferRowProps {
  offer: Offer;
  discogsId: string;
}

function OfferRow({ offer, discogsId }: OfferRowProps) {
  const handlePress = useCallback(async () => {
    analytics.offerClick({
      listing_id: offer.listing_id,
      store_slug: offer.store.slug,
      price_rub: Number(offer.price_rub),
      discogs_id: discogsId,
    });

    // 1. Регистрируем клик и получаем финальный URL с affiliate-subid.
    //    Если бэк упал — открываем preview-URL из offer.url (UTM-only).
    let urlToOpen = offer.url;
    try {
      const { url } = await api.trackOfferClick(offer.listing_id);
      urlToOpen = url;
    } catch {
      // network/server error — fallback на preview-URL, не блокируем переход
    }

    try {
      await Linking.openURL(urlToOpen);
    } catch {
      // магазин-URL невалидный — аналитику уже отправили
    }
  }, [discogsId, offer]);

  const priceFormatted = Math.round(Number(offer.price_rub)).toLocaleString('ru-RU');
  const metaParts: string[] = [];
  if (offer.format) metaParts.push(offer.format);
  if (offer.vinyl_color) metaParts.push(offer.vinyl_color);
  if (offer.condition) metaParts.push(offer.condition);
  const meta = metaParts.join(' · ');

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.offerRow,
        pressed && { opacity: 0.72 },
      ]}
    >
      <StoreLogo slug={offer.store.slug} size={40} radius={BorderRadius.sm} fallbackName={offer.store.name} />

      <View style={styles.middle}>
        <Text style={styles.storeName} numberOfLines={1}>
          {offer.store.name}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {offer.status === 'preorder' ? (
          <Text style={styles.preorderTag}>Предзаказ</Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={styles.price}>{priceFormatted} ₽</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>Купить</Text>
          <Icon name="arrow-right" size={12} color="accent" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // ---- Shell ----
  shell: {
    marginVertical: Spacing.sm,
    backgroundColor: MarketPalette.void,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MarketPalette.chrome.border,
    // Лёгкая ember-aura — подчёркивает что это «карман маркета»
    shadowColor: '#FF7A4A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MarketPalette.chrome.border,
  },
  headerBadgeText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    color: '#FFD9C8',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  list: {
    gap: Spacing.xs + 2,
  },
  loadingRow: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.bodySmall,
    color: 'rgba(255,255,255,0.7)',
  },
  disclaimer: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.45)',
    marginTop: Spacing.sm,
  },

  // ---- Offer row ----
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.05)',
    gap: Spacing.sm,
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  storeName: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  meta: {
    ...Typography.caption,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  preorderTag: {
    ...Typography.caption,
    color: '#FFD9C8',
    marginTop: 2,
    fontWeight: '700',
  },
  right: {
    alignItems: 'flex-end',
  },
  price: {
    ...Typography.h3,
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ctaText: {
    ...Typography.caption,
    color: '#FFD9C8',
    fontWeight: '700',
  },

  // ---- Market entry: single store ----
  marketEntryWrap: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  marketEntryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  marketEntryEyebrow: {
    fontFamily: 'Inter_700Bold',
    fontSize: 9.5,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.78)',
    letterSpacing: 1.1,
    marginBottom: 3,
  },
  marketEntryTitle: {
    fontFamily: 'Inter_800ExtraBold',
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 19,
  },
  marketEntryArrowCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ---- Market entry: multi store ----
  multiBlock: {
    marginTop: Spacing.md,
    gap: 6,
  },
  multiBlockTitle: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  marketEntryMultiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: MarketPalette.chrome.border,
  },
  marketEntryMultiName: {
    fontFamily: 'Inter_700Bold',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  marketEntryMultiSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
});

export default OffersBlock;
