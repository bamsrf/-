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
import { useCallback, useEffect, useState } from 'react';
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

      {/* Generic CTA → ведём в Маркет в целом (не в конкретный магазин).
          Юзер увидел текущего продавца в OfferRow выше — дубль лого внизу
          лишний. Плашка единая: disc-иконка + копи + arrow.
          Routes to /(tabs)/search где живёт раздел Маркет. */}
      <Pressable
        onPress={() =>
          // ?focus=market — search.tsx прочитает query-param и сразу
          // проскроллит к секции Маркета (вместо приземления на чистый
          // Поиск, где Маркет где-то снизу за горизонтом).
          router.push({
            pathname: '/(tabs)/search' as any,
            params: { focus: 'market' },
          })
        }
        accessibilityRole="button"
        accessibilityLabel="Открыть Маркет"
        style={({ pressed }) => [styles.marketEntryWrap, pressed && { opacity: 0.85 }]}
      >
        <LinearGradient
          colors={Gradients.hotStock as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.marketEntryGradient}
        >
          <View style={styles.marketEntryDiscBadge}>
            <Icon name="disc" size={22} color="onBrand" weight="duotone" />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.marketEntryEyebrow} numberOfLines={1}>
              В МАРКЕТЕ
            </Text>
            <Text style={styles.marketEntryTitle} numberOfLines={2}>
              Нажми и посмотри, что ещё есть в наличии
            </Text>
          </View>
          <View style={styles.marketEntryArrowCircle}>
            <Icon name="arrow-right" size={16} color="onBrand" />
          </View>
        </LinearGradient>
      </Pressable>
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
  // Мета: цвет винила (если нестандартный) + condition. Формат скрываем
  // если LP/Vinyl (стандартный пресс, дублирует record header). Цвет —
  // ценная инфа (лимитка/пресс), пишем как отдельный «X винил».
  const formatToShow =
    offer.format && !/^(lp|vinyl)$/i.test(offer.format.trim())
      ? offer.format
      : null;
  const metaParts: string[] = [];
  if (formatToShow) metaParts.push(formatToShow);
  if (offer.vinyl_color) metaParts.push(`${offer.vinyl_color} винил`);
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
  marketEntryDiscBadge: {
    // Disc-знак Маркета (заменяет лого магазина в нижней CTA).
    // Контрастная white-15 подложка чтобы duotone-иконка читалась поверх
    // gradient'а.
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

});

export default OffersBlock;
