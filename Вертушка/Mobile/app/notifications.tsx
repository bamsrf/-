/**
 * Экран «Активность» — личные уведомления + лента подписок.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';
import { AnimatedGradientText } from '@/components/AnimatedGradientText';
import { SegmentedControl } from '@/components/ui';
import { XV2 } from '@/components/icons/v2';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { SocialFeedRow } from '@/components/notifications/SocialFeedRow';
import { NotificationsEmpty } from '@/components/notifications/NotificationsEmpty';
import { useNotificationsStore } from '@/lib/notificationsStore';
import type { NotificationItem as NotificationItemType, SocialFeedItem } from '@/lib/types';

type Tab = 'personal' | 'social';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('personal');

  const {
    personalItems,
    personalLoading,
    personalRefreshing,
    personalNextCursor,
    socialItems,
    socialLoading,
    socialRefreshing,
    socialNextCursor,
    unreadCount,
    loadPersonal,
    loadMorePersonal,
    loadSocial,
    loadMoreSocial,
    markRead,
    markAllRead,
  } = useNotificationsStore();

  useEffect(() => {
    loadPersonal();
  }, [loadPersonal]);

  useEffect(() => {
    if (tab === 'social' && socialItems.length === 0) {
      loadSocial();
    }
  }, [tab, socialItems.length, loadSocial]);

  const handleClose = useCallback(() => router.back(), [router]);

  const handlePersonalPress = useCallback(
    async (item: NotificationItemType) => {
      if (!item.read_at) {
        await markRead(item.id);
      }
      routeForPersonal(item, router);
    },
    [markRead, router],
  );

  const handleSocialPress = useCallback(
    (item: SocialFeedItem) => {
      routeForSocial(item, router);
    },
    [router],
  );

  const handleRefresh = useCallback(() => {
    if (tab === 'personal') loadPersonal({ refresh: true });
    else loadSocial({ refresh: true });
  }, [tab, loadPersonal, loadSocial]);

  const handleEndReached = useCallback(() => {
    if (tab === 'personal' && personalNextCursor) loadMorePersonal();
    else if (tab === 'social' && socialNextCursor) loadMoreSocial();
  }, [tab, personalNextCursor, socialNextCursor, loadMorePersonal, loadMoreSocial]);

  const renderPersonal = ({ item }: { item: NotificationItemType }) => (
    <NotificationItem item={item} onPress={handlePersonalPress} />
  );
  const renderSocial = ({ item }: { item: SocialFeedItem }) => (
    <SocialFeedRow item={item} onPress={handleSocialPress} />
  );

  const showFooter =
    (tab === 'personal' && personalLoading && personalItems.length > 0) ||
    (tab === 'social' && socialLoading && socialItems.length > 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <AnimatedGradientText style={styles.headerTitle}>Активность</AnimatedGradientText>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn} hitSlop={12}>
          <XV2 size={24} color={Colors.text} weight="bold" />
        </TouchableOpacity>
      </View>

      <View style={styles.segmentWrap}>
        <SegmentedControl
          segments={[
            { key: 'personal', label: unreadCount > 0 ? `Ты (${unreadCount})` : 'Ты' },
            { key: 'social', label: 'Подписки' },
          ]}
          selectedKey={tab}
          onSelect={setTab}
        />
      </View>

      {tab === 'personal' && unreadCount > 0 ? (
        <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
          <Text style={styles.markAllText}>Отметить всё прочитанным</Text>
        </TouchableOpacity>
      ) : null}

      {tab === 'personal' ? (
        <FlatList
          data={personalItems}
          keyExtractor={(item) => item.id}
          renderItem={renderPersonal}
          contentContainerStyle={
            personalItems.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={personalRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.royalBlue}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            !personalLoading ? (
              <NotificationsEmpty
                title="Пока тихо"
                subtitle="Здесь появятся новые подписчики, бронирования подарков, ачивки и алерты вишлиста."
              />
            ) : (
              <View style={styles.spinner}><ActivityIndicator color={Colors.royalBlue} /></View>
            )
          }
          ListFooterComponent={
            showFooter ? <View style={styles.spinner}><ActivityIndicator color={Colors.royalBlue} /></View> : null
          }
        />
      ) : (
        <FlatList
          data={socialItems}
          keyExtractor={(item, idx) => `${item.type}-${item.actor.id}-${item.created_at}-${idx}`}
          renderItem={renderSocial}
          contentContainerStyle={
            socialItems.length === 0 ? styles.emptyContainer : styles.listContainer
          }
          refreshControl={
            <RefreshControl
              refreshing={socialRefreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.royalBlue}
            />
          }
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            !socialLoading ? (
              <NotificationsEmpty
                title="Лента пуста"
                subtitle="Подпишись на других коллекционеров, чтобы видеть их новые пластинки, подарки и ачивки."
              />
            ) : (
              <View style={styles.spinner}><ActivityIndicator color={Colors.royalBlue} /></View>
            )
          }
          ListFooterComponent={
            showFooter ? <View style={styles.spinner}><ActivityIndicator color={Colors.royalBlue} /></View> : null
          }
        />
      )}
    </View>
  );
}

function routeForPersonal(item: NotificationItemType, router: ReturnType<typeof useRouter>) {
  const data = item.data || {};
  switch (item.type) {
    case 'follow_request':
      router.push('/social/follow-requests');
      return;
    case 'new_follower':
      if (item.actor?.username) router.push(`/user/${item.actor.username}`);
      return;
    case 'gift_booked':
    case 'gift_confirmed':
      // нет deeplink на gift-booking deta — открываем профиль
      router.push('/profile');
      return;
    case 'wishlist_in_stock':
    case 'wishlist_price_drop':
      if (data.record_id) router.push(`/record/${data.record_id}`);
      return;
    case 'achievement_unlocked':
      router.push('/profile');
      return;
  }
}

function routeForSocial(item: SocialFeedItem, router: ReturnType<typeof useRouter>) {
  switch (item.type) {
    case 'collection_add':
    case 'wishlist_add':
      if (item.record?.id) router.push(`/record/${item.record.id}`);
      return;
    case 'gift_completed':
      if (item.target_user?.username) router.push(`/user/${item.target_user.username}`);
      return;
    case 'friend_achievement':
    case 'friend_new_following':
      if (item.actor.username) router.push(`/user/${item.actor.username}`);
      return;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  headerTitleWrap: {
    flex: 1,
    flexShrink: 1,
  },
  headerTitle: {
    ...Typography.display,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentWrap: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  markAllBtn: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
    alignItems: 'flex-end',
  },
  markAllText: {
    ...Typography.bodySmall,
    color: Colors.royalBlue,
    fontFamily: 'Inter_600SemiBold',
  },
  listContainer: {
    paddingBottom: Spacing.xxl,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingBottom: Spacing.xxl,
  },
  spinner: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
