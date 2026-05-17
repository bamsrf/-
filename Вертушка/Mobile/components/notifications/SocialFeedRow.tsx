/**
 * Карточка события в социальной ленте «Подписки».
 */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, Typography } from '@/constants/theme';
import { Icon } from '@/components/ui';
import { resolveMediaUrl, getCoverUrl } from '@/lib/api';
import type { SocialFeedItem } from '@/lib/types';

interface Props {
  item: SocialFeedItem;
  onPress: (item: SocialFeedItem) => void;
}

function formatRelative(iso: string): string {
  const diffSec = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'только что';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} мин`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} ч`;
  return `${Math.floor(diffSec / 86400)} д`;
}

function buildText(item: SocialFeedItem): string {
  const actor = item.actor.display_name || item.actor.username;
  const recTitle = item.record?.title ?? '';
  switch (item.type) {
    case 'collection_add':
      return `${actor} добавил(а) «${recTitle}» в коллекцию`;
    case 'wishlist_add':
      return `${actor} добавил(а) «${recTitle}» в вишлист`;
    case 'gift_completed': {
      const target = item.target_user?.display_name || item.target_user?.username || 'друга';
      return `${actor} подарил(а) «${recTitle}» — ${target}`;
    }
    case 'friend_achievement':
      return `${actor} получил(а) новую ачивку`;
    case 'friend_new_following': {
      const target = item.target_user?.display_name || item.target_user?.username || 'кого-то';
      return `${actor} подписался(ась) на ${target}`;
    }
    default:
      return `${actor}`;
  }
}

export const SocialFeedRow: React.FC<Props> = ({ item, onPress }) => {
  const text = useMemo(() => buildText(item), [item]);
  const avatarUrl = item.actor.avatar_url ? resolveMediaUrl(item.actor.avatar_url) : undefined;
  const coverUrl = getCoverUrl(
    item.record
      ? {
          cover_url: item.record.cover_url ?? undefined,
        }
      : undefined,
  );

  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.row} onPress={() => onPress(item)}>
      <View style={styles.avatarWrap}>
        {avatarUrl ? (
          <Image source={avatarUrl} style={styles.avatar} cachePolicy="disk" />
        ) : (
          <LinearGradient
            colors={[Colors.royalBlue, Colors.periwinkle]}
            style={styles.avatar}
          >
            <Icon name="person" size={18} color={Colors.background} />
          </LinearGradient>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.text} numberOfLines={2}>{text}</Text>
        <Text style={styles.time}>{formatRelative(item.created_at)}</Text>
      </View>

      {coverUrl ? (
        <Image source={coverUrl} style={styles.cover} cachePolicy="disk" />
      ) : null}
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
  avatarWrap: {
    width: 40,
    height: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  cover: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.sm,
  },
});

export default SocialFeedRow;
