/**
 * Превью-карточка «Активность» для экрана профиля.
 *
 * Показывает unread-pill и 2-3 последних personal-уведомления. Тап → /notifications.
 */
import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { BellV2, CaretRightV2 } from '@/components/icons/v2';
import { useNotificationsStore } from '@/lib/notificationsStore';

function formatRelative(iso: string): string {
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'только что';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч`;
  return `${Math.floor(diffSec / 86400)} д`;
}

export const ActivityCard: React.FC = () => {
  const router = useRouter();
  const { unreadCount, personalItems, personalLoaded, fetchUnreadCount, loadPersonal } =
    useNotificationsStore();

  useEffect(() => {
    fetchUnreadCount();
    if (!personalLoaded) loadPersonal();
  }, [fetchUnreadCount, loadPersonal, personalLoaded]);

  const preview = useMemo(() => personalItems.slice(0, 2), [personalItems]);

  const handleOpen = () => {
    router.push('/notifications');
  };

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={handleOpen}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <BellV2 size={18} color={Colors.royalBlue} weight="regular" />
          <Text style={styles.title}>Уведомления</Text>
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          ) : null}
        </View>
        <CaretRightV2 size={18} color={Colors.textMuted} weight="regular" />
      </View>

      {preview.length === 0 ? (
        <Text style={styles.empty}>
          Здесь появятся новые подписчики, бронирования подарков и алерты вишлиста.
        </Text>
      ) : (
        <View style={styles.previewList}>
          {preview.map((item) => {
            const actor =
              (item.actor?.display_name as string | undefined) ||
              (item.actor?.username as string | undefined) ||
              'Кто-то';
            return (
              <View key={item.id} style={styles.previewRow}>
                {!item.read_at ? <View style={styles.unreadDot} /> : <View style={styles.unreadDotPlaceholder} />}
                <Text style={styles.previewText} numberOfLines={1}>
                  <Text style={styles.previewActor}>{actor}</Text>
                  {' '}
                  {previewBody(item.type, item.data)}
                </Text>
                <Text style={styles.previewTime}>{formatRelative(item.created_at)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </TouchableOpacity>
  );
};

function previewBody(type: string, data: Record<string, unknown>): string {
  switch (type) {
    case 'follow_request':
      return 'хочет подписаться';
    case 'new_follower':
      return data.approved ? 'принял(а) подписку' : 'подписался(ась) на тебя';
    case 'gift_booked':
      return 'забронировал(а) подарок';
    case 'gift_confirmed':
      return 'подтвердил(а) выдачу';
    case 'wishlist_in_stock':
      return 'появилась в продаже';
    case 'wishlist_price_drop':
      return 'подешевела';
    case 'achievement_unlocked':
      return '— новая ачивка';
    default:
      return '';
  }
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  badgeText: {
    ...Typography.caption,
    color: Colors.background,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
    lineHeight: 14,
  },
  empty: {
    ...Typography.bodySmall,
    color: Colors.textMuted,
  },
  previewList: {
    gap: 6,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.royalBlue,
  },
  unreadDotPlaceholder: {
    width: 6,
    height: 6,
  },
  previewText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    flex: 1,
  },
  previewActor: {
    color: Colors.text,
    fontFamily: 'Inter_600SemiBold',
  },
  previewTime: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});

export default ActivityCard;
