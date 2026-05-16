/**
 * Блок «Где купить» на экране записи.
 *
 * Дёргает /api/records/{discogs_id}/offers, показывает карточки магазинов
 * с ценой и кнопкой «Купить». При тапе открывает URL магазина (Linking).
 *
 * Состояния: loading (скелет 2 карточек) / empty (тихо ничего не рендерим —
 * чтобы пустой раздел не торчал на каждой пластинке) / error (компакт).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';

import { Card, Icon } from './ui';
import { api } from '../lib/api';
import { analytics } from '../lib/analytics';
import { Offer } from '../lib/types';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/theme';

interface OffersBlockProps {
  discogsId: string;
}

export function OffersBlock({ discogsId }: OffersBlockProps) {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    try {
      await Linking.openURL(offer.url);
    } catch {
      // если магазин-URL невалидный — просто игнорим, аналитику уже отправили
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
      <View style={styles.storeBadge}>
        {offer.store.logo_url ? (
          <Image
            source={offer.store.logo_url}
            style={styles.logo}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View style={[styles.logo, styles.logoPlaceholder]}>
            <Icon name="buildings" size={20} color={Colors.textSecondary} />
          </View>
        )}
      </View>

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
});

export default OffersBlock;
