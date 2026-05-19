/**
 * Блок «Где купить» на экране записи.
 *
 * Дёргает /api/records/{discogs_id}/offers, показывает карточки магазинов
 * с ценой и кнопкой «Купить». При тапе открывает URL магазина (Linking).
 *
 * Состояния: loading (скелет 2 карточек) / empty (тихо ничего не рендерим —
 * чтобы пустой раздел не торчал на каждой пластинке) / error (компакт).
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
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

import { Card, Icon } from './ui';
import { api } from '../lib/api';
import { analytics } from '../lib/analytics';
import { Offer } from '../lib/types';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';
import StoreLogo from './market/StoreLogo';

interface OffersBlockProps {
  discogsId: string;
}

export function OffersBlock({ discogsId }: OffersBlockProps) {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Уникальные магазины из текущих offers — для кнопок «Смотреть в Маркете».
  // Если 2+ магазина — показываем одну общую кнопку (отправляем в /market глобально).
  // Если ровно 1 — отправляем сразу в его витрину /market/store/{slug}.
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

  // Loading: компактный скелет, не растягиваем экран
  if (offers === null && !error) {
    return (
      <Card variant="flat" style={styles.card}>
        <Text style={styles.title}>Где купить</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={Colors.royalBlue} />
        </View>
      </Card>
    );
  }

  // Empty: ничего не рендерим — на пластинках без offers блок не торчит
  if (!error && offers !== null && offers.length === 0) {
    return null;
  }

  // Error: компактная плашка, не блокирующая
  if (error) {
    return (
      <Card variant="flat" style={styles.card}>
        <Text style={styles.title}>Где купить</Text>
        <Text style={styles.errorText}>{error}</Text>
      </Card>
    );
  }

  return (
    <Card variant="flat" style={styles.card}>
      <Text style={styles.title}>Где купить</Text>
      <View style={styles.list}>
        {offers!.map((offer) => (
          <OfferRow key={offer.listing_id} offer={offer} discogsId={discogsId} />
        ))}
      </View>
      <Text style={styles.disclaimer}>
        Цены и наличие — со страниц магазинов, обновляются ежедневно.
      </Text>

      {/* Точка входа в Маркет — отдельная кнопка для каждого магазина с offer.
          Если магазин один — «Все товары {name} в Маркете →».
          Если 2+  — «Смотреть в Маркете →» (без указания slug, ведёт в search.tsx). */}
      {storeButtons.length === 1 && (
        <Pressable
          onPress={() => router.push(`/market/store/${storeButtons[0].slug}` as any)}
          style={({ pressed }) => [styles.marketEntry, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={`Открыть витрину ${storeButtons[0].name} в Маркете`}
        >
          <Icon name="storefront" size={18} color="brand" />
          <Text style={styles.marketEntryText}>
            Все товары {storeButtons[0].name} в Маркете
          </Text>
          <Icon name="arrow-right" size={14} color="brand" />
        </Pressable>
      )}
      {storeButtons.length > 1 && (
        <View style={styles.marketEntryMulti}>
          {storeButtons.map((s) => (
            <Pressable
              key={s.slug}
              onPress={() => router.push(`/market/store/${s.slug}` as any)}
              style={({ pressed }) => [styles.marketEntryMultiBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel={`Открыть витрину ${s.name} в Маркете`}
            >
              <StoreLogo slug={s.slug} size={20} radius={4} />
              <Text style={styles.marketEntryMultiText} numberOfLines={1}>
                {s.name}
              </Text>
              <Icon name="arrow-right" size={12} color="brand" />
            </Pressable>
          ))}
        </View>
      )}
    </Card>
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
        pressed && { opacity: 0.7 },
      ]}
    >
      {/* Используем bundled StoreLogo через slug — приоритетнее `offer.store.logo_url`
          (его бэк пока не отдаёт). Fallback внутри StoreLogo: monogram-badge
          из первой буквы названия в круге brand.cobaltDeep. */}
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
          <Icon name="arrow-right" size={14} color={Colors.royalBlue} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: Spacing.sm,
  },
  title: {
    ...Typography.h3,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  list: {
    gap: Spacing.sm,
  },
  loadingRow: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  errorText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  disclaimer: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  // ---- Строка предложения ----
  offerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  storeBadge: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  logo: {
    width: 40,
    height: 40,
  },
  logoPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  middle: {
    flex: 1,
    minWidth: 0,
  },
  storeName: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  meta: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  preorderTag: {
    ...Typography.caption,
    color: Colors.royalBlue,
    marginTop: 2,
    fontWeight: '600',
  },
  right: {
    alignItems: 'flex-end',
  },
  price: {
    ...Typography.h3,
    color: Colors.text,
    fontWeight: '700',
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ctaText: {
    ...Typography.caption,
    color: Colors.royalBlue,
    fontWeight: '600',
  },

  // ---- Точки входа в Маркет (новое) ----
  marketEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(59, 75, 245, 0.15)', // royalBlue tint
  },
  marketEntryText: {
    flex: 1,
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.royalBlue,
  },
  marketEntryMulti: {
    marginTop: Spacing.sm,
    gap: 6,
  },
  marketEntryMultiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(59, 75, 245, 0.12)',
  },
  marketEntryMultiText: {
    flex: 1,
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text,
  },
});

export default OffersBlock;
