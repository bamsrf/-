/**
 * Карточка уведомления в ленте «Ты».
 */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { resolveMediaUrl } from '@/lib/api';
import type { NotificationItem as NotificationItemType, NotificationType } from '@/lib/types';

interface Props {
  item: NotificationItemType;
  onPress: (item: NotificationItemType) => void;
}

function formatRelativeTime(iso: string): string {
  const created = new Date(iso).getTime();
  const diffSec = Math.max(0, (Date.now() - created) / 1000);
  if (diffSec < 60) return 'только что';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч`;
  const days = Math.floor(diffSec / 86400);
  if (days < 7) return `${days} д`;
  if (days < 30) return `${Math.floor(days / 7)} нед`;
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function iconForType(type: NotificationType): { name: string; tint: string } {
  switch (type) {
    case 'follow_request':
      return { name: 'person-add', tint: Colors.royalBlue };
    case 'new_follower':
      return { name: 'person-add', tint: Colors.success };
    case 'gift_booked':
    case 'gift_confirmed':
      return { name: 'gift', tint: Colors.royalBlue };
    case 'wishlist_in_stock':
    case 'wishlist_price_drop':
      return { name: 'pricetag', tint: Colors.success };
    case 'achievement_unlocked':
      return { name: 'trophy', tint: Colors.warning };
    default:
      return { name: 'notifications', tint: Colors.royalBlue };
  }
}

function buildText(item: NotificationItemType): string {
  const actorName =
    (item.actor?.display_name as string | undefined) ||
    (item.actor?.username as string | undefined) ||
    'Кто-то';
  const data = item.data || {};

  switch (item.type) {
    case 'follow_request':
      return `${actorName} хочет на тебя подписаться`;
    case 'new_follower':
      return data.approved
        ? `${actorName} принял(а) твою подписку`
        : `${actorName} подписался(ась) на тебя`;
    case 'gift_booked': {
      const title = (data.record_title as string | undefined) ?? 'пластинку';
      return data.anonymous
        ? `Кто-то забронировал «${title}» из твоего вишлиста`
        : `${actorName} забронировал(а) «${title}»`;
    }
    case 'gift_confirmed': {
      const title = (data.record_title as string | undefined) ?? 'пластинку';
      return `${actorName} подтвердил(а) выдачу «${title}»`;
    }
    case 'wishlist_in_stock': {
      const title = (data.record_title as string | undefined) ?? 'пластинка';
      return `«${title}» снова в продаже`;
    }
    case 'wishlist_price_drop': {
      const title = (data.record_title as string | undefined) ?? 'пластинка';
      const price = data.price_rub ? ` за ${data.price_rub}₽` : '';
      return `«${title}» подешевела${price}`;
    }
    case 'achievement_unlocked': {
      const code = (data.code as string | undefined) ?? '';
      return `Новая ачивка: ${code}`;
    }
    default:
      return 'Новое уведомление';
  }
}

export const NotificationItem: React.FC<Props> = ({ item, onPress }) => {
  const unread = !item.read_at;
  const text = useMemo(() => buildText(item), [item]);
  const meta = useMemo(() => iconForType(item.type), [item.type]);
  const avatarUrl = item.actor?.avatar_url ? resolveMediaUrl(item.actor.avatar_url) : undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[styles.row, unread && styles.rowUnread]}
      onPress={() => onPress(item)}
    >
      <View style={styles.unreadCol}>
        {unread ? <View style={styles.unreadDot} /> : null}
      </View>

      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={avatarUrl} style={styles.avatar} cachePolicy="disk" />
        ) : (
          <LinearGradient
            colors={[Colors.royalBlue, Colors.periwinkle]}
            style={styles.avatarPlaceholder}
          >
            <Icon name={meta.name as any} size={20} color={Colors.background} />
          </LinearGradient>
        )}
        <View style={[styles.iconBadge, { backgroundColor: meta.tint }]}>
          <Icon name={meta.name as any} size={10} color={Colors.background} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.text} numberOfLines={2}>
          {text}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(item.created_at)}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  rowUnread: {
    backgroundColor: 'rgba(59, 75, 245, 0.04)',
  },
  unreadCol: {
    width: 10,
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.royalBlue,
  },
  avatarWrap: {
    width: 44,
    height: 44,
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  text: {
    ...Typography.bodySmall,
    color: Colors.text,
  },
  time: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
});

export default NotificationItem;
