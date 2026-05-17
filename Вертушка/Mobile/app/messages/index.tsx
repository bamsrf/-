/**
 * Инбокс сообщений.
 *
 * Папка «Запросы» доступна через строку-вход сверху списка, если есть pending
 * (фактическое разделение primary/requests включается на M3, в M1 все треды
 * лежат в primary).
 */
import { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';
import { useAuthStore } from '../../lib/store';
import { useMessagesStore } from '../../lib/messagesStore';
import { resolveMediaUrl } from '../../lib/api';
import type { Conversation } from '../../lib/messagesTypes';
import { Header } from '../../components/Header';

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  }
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (diffDays < 7) {
    return d.toLocaleDateString('ru-RU', { weekday: 'short' });
  }
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function ConversationRow({
  item,
  isMine,
  onPress,
}: {
  item: Conversation;
  isMine: boolean;
  onPress: () => void;
}) {
  const initials = item.partner.username.slice(0, 2).toLowerCase();
  const previewPrefix = isMine ? 'Вы: ' : '';
  const preview = item.last_message_preview ?? 'Нет сообщений';
  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.row} onPress={onPress}>
      <View style={styles.avatar}>
        {item.partner.avatar_url ? (
          <Image
            source={resolveMediaUrl(item.partner.avatar_url)}
            style={{ width: 52, height: 52, borderRadius: 26 }}
            cachePolicy="disk"
          />
        ) : (
          <Text style={styles.avatarTxt}>{initials}</Text>
        )}
      </View>
      <View style={styles.rowMain}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>
            {item.partner.display_name || `@${item.partner.username}`}
          </Text>
          <Text style={styles.rowTime}>{formatTime(item.last_message_at)}</Text>
        </View>
        <View style={styles.rowBottom}>
          <Text
            style={[styles.rowPreview, item.unread_count > 0 && styles.rowPreviewUnread]}
            numberOfLines={1}
          >
            {previewPrefix}
            {preview}
          </Text>
          {item.unread_count > 0 ? (
            <View style={styles.unreadDot}>
              <Text style={styles.unreadTxt}>
                {item.unread_count > 99 ? '99+' : item.unread_count}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);
  const conversations = useMessagesStore((s) => s.conversationsPrimary);
  const requests = useMessagesStore((s) => s.conversationsRequests);
  const isLoading = useMessagesStore((s) => s.isLoadingList);
  const loadConversations = useMessagesStore((s) => s.loadConversations);
  const refreshUnread = useMessagesStore((s) => s.refreshUnread);

  const reload = useCallback(async () => {
    await Promise.all([
      loadConversations('primary'),
      loadConversations('requests'),
      refreshUnread(),
    ]);
  }, [loadConversations, refreshUnread]);

  useEffect(() => {
    reload();
  }, [reload]);

  const renderItem = useCallback(
    ({ item }: { item: Conversation }) => (
      <ConversationRow
        item={item}
        isMine={!!me && item.last_message_sender_id === me.id}
        onPress={() => router.push(`/messages/${item.id}` as any)}
      />
    ),
    [me, router]
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Icon name="chat-circle" size={48} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Пока нет сообщений</Text>
        <Text style={styles.emptySub}>
          Откройте чей-нибудь профиль и нажмите «Написать»
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header title="Сообщения" showBack showProfile={false} />

      {requests.length > 0 ? (
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.requestsBanner}
          onPress={() => router.push('/messages/requests' as any)}
        >
          <View style={styles.requestsIcon}>
            <Icon name="envelope" size={18} color={Colors.royalBlue} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.requestsTitle}>Запросы сообщений</Text>
            <Text style={styles.requestsSub}>
              {requests.length} новых
            </Text>
          </View>
          <Icon name="arrow-right" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      ) : null}

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
            tintColor={Colors.royalBlue}
          />
        }
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 100 }]}
        activeOpacity={0.85}
        onPress={() => router.push('/messages/new' as any)}
      >
        <Icon name="pencil" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.md,
    marginTop: 4,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requestsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestsTitle: { fontSize: 14, fontWeight: '600', color: Colors.text },
  requestsSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 160 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarTxt: { fontSize: 14, fontWeight: '600', color: Colors.royalBlue, textTransform: 'uppercase' },
  rowMain: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  rowTime: { fontSize: 11, color: Colors.textMuted },
  rowBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
    gap: Spacing.sm,
  },
  rowPreview: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  rowPreviewUnread: { color: Colors.text, fontWeight: '500' },
  unreadDot: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    borderRadius: 10,
    backgroundColor: Colors.royalBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadTxt: { fontSize: 10, color: '#fff', fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: Spacing.sm },
  emptySub: { fontSize: 13, color: Colors.textMuted, textAlign: 'center' },

  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.royalBlue,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.royalBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
});
