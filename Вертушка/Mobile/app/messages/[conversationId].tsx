/**
 * Экран одного диалога: список сообщений + ввод.
 *
 * M1: polling getConversation каждые 8с, пока экран открыт.
 * В M2 заменится на WebSocket push.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useAuthStore } from '../../lib/store';
import { useMessagesStore } from '../../lib/messagesStore';
import { resolveMediaUrl } from '../../lib/api';
import { messagesApi } from '../../lib/messagesApi';
import type { Conversation, Message } from '../../lib/messagesTypes';

const POLL_INTERVAL_MS = 8000;

function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  if (message.deleted_at) {
    return (
      <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}>
        <View style={[styles.bubble, styles.bubbleDeleted]}>
          <Text style={styles.bubbleDeletedTxt}>Сообщение удалено</Text>
        </View>
      </View>
    );
  }

  const isFailed = message._local_status === 'failed';
  const isSending = message._local_status === 'sending';

  return (
    <View style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
        <Text style={[styles.bubbleBody, isMine && styles.bubbleBodyMine]}>
          {message.body}
        </Text>
        <View style={styles.bubbleMeta}>
          <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
            {formatBubbleTime(message.created_at)}
          </Text>
          {isMine && isSending ? (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />
          ) : null}
          {isMine && isFailed ? (
            <Icon name="warning" size={12} color="#fff" />
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function ConversationScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);

  const messages = useMessagesStore((s) => s.threads[conversationId ?? ''] ?? []);
  const conversation = useMessagesStore((s) => {
    const id = conversationId;
    if (!id) return null;
    return (
      s.conversationsPrimary.find((c) => c.id === id) ||
      s.conversationsRequests.find((c) => c.id === id) ||
      null
    );
  });
  const isLoading = useMessagesStore(
    (s) => !!s.isLoadingThread[conversationId ?? '']
  );
  const loadThread = useMessagesStore((s) => s.loadThread);
  const loadMore = useMessagesStore((s) => s.loadMore);
  const sendMessage = useMessagesStore((s) => s.send);
  const markRead = useMessagesStore((s) => s.markRead);
  const retrySend = useMessagesStore((s) => s.retrySend);

  const [draft, setDraft] = useState('');
  const [partner, setPartner] = useState<Conversation['partner'] | null>(
    conversation?.partner ?? null
  );
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (conversation?.partner) setPartner(conversation.partner);
  }, [conversation?.partner]);

  // Первая загрузка — берём детали + перешлём в store.
  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      try {
        const detail = await messagesApi.getConversation(conversationId);
        setPartner(detail.conversation.partner);
        await loadThread(conversationId);
      } catch {
        // молча, экран отрендерит пусто
      }
    })();
  }, [conversationId, loadThread]);

  // Polling пока экран foreground и активен.
  useEffect(() => {
    if (!conversationId) return undefined;
    let timer: ReturnType<typeof setInterval> | null = null;
    let appState: AppStateStatus = AppState.currentState;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        loadThread(conversationId);
      }, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    start();
    const sub = AppState.addEventListener('change', (next) => {
      if (appState.match(/inactive|background/) && next === 'active') {
        loadThread(conversationId);
        start();
      } else if (next.match(/inactive|background/)) {
        stop();
      }
      appState = next;
    });

    return () => {
      stop();
      sub.remove();
    };
  }, [conversationId, loadThread]);

  // Отметить прочитанным когда есть свежие
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    if (!conversation || conversation.unread_count === 0) return;
    markRead(conversationId);
  }, [conversationId, messages.length, conversation, markRead]);

  const handleSend = useCallback(async () => {
    if (!conversationId || !draft.trim()) return;
    const text = draft;
    setDraft('');
    await sendMessage(conversationId, text);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [conversationId, draft, sendMessage]);

  const handleRetry = useCallback(
    (msg: Message) => {
      if (!conversationId) return;
      retrySend(conversationId, msg.id);
    },
    [conversationId, retrySend]
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isMine = !!me && item.sender_id === me.id;
      const isFailed = item._local_status === 'failed';
      if (isFailed) {
        return (
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleRetry(item)}>
            <MessageBubble message={item} isMine={isMine} />
            <Text style={styles.failedHint}>Не отправлено — нажмите, чтобы повторить</Text>
          </TouchableOpacity>
        );
      }
      return <MessageBubble message={item} isMine={isMine} />;
    },
    [me, handleRetry]
  );

  const headerName = useMemo(() => {
    if (!partner) return '';
    return partner.display_name || `@${partner.username}`;
  }, [partner]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="chevron-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.partnerWrap}
          onPress={() => {
            if (partner) router.push(`/user/${partner.username}` as any);
          }}
        >
          <View style={styles.partnerAvatar}>
            {partner?.avatar_url ? (
              <Image
                source={resolveMediaUrl(partner.avatar_url)}
                style={{ width: 32, height: 32, borderRadius: 16 }}
                cachePolicy="disk"
              />
            ) : (
              <Text style={styles.partnerAvatarTxt}>
                {(partner?.username ?? '').slice(0, 2).toLowerCase()}
              </Text>
            )}
          </View>
          <Text style={styles.partnerName} numberOfLines={1}>
            {headerName}
          </Text>
        </TouchableOpacity>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
        onEndReachedThreshold={0.1}
        onStartReached={() => conversationId && loadMore(conversationId)}
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.emptyConv}>
              <Text style={styles.emptyConvTxt}>Напишите первое сообщение</Text>
            </View>
          )
        }
      />

      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          placeholder="Сообщение"
          placeholderTextColor={Colors.textMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={4000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, !draft.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!draft.trim()}
          activeOpacity={0.85}
        >
          <Icon name="arrow-up" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  partnerWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  partnerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  partnerAvatarTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.royalBlue,
    textTransform: 'uppercase',
  },
  partnerName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },

  list: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, gap: 6 },

  bubbleWrap: { width: '100%', marginBottom: 4 },
  bubbleWrapMine: { alignItems: 'flex-end' },
  bubbleWrapOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleMine: {
    backgroundColor: Colors.royalBlue,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
  },
  bubbleDeleted: {
    backgroundColor: Colors.surfaceHover,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleBody: { fontSize: 14, color: Colors.text, lineHeight: 19 },
  bubbleBodyMine: { color: '#fff' },
  bubbleDeletedTxt: {
    fontSize: 12,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  bubbleMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  bubbleTime: { fontSize: 10, color: Colors.textMuted },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.75)' },

  failedHint: {
    fontSize: 11,
    color: '#E5484D',
    textAlign: 'right',
    marginTop: 2,
    marginRight: 4,
  },

  emptyConv: { alignItems: 'center', paddingVertical: 80 },
  emptyConvTxt: { fontSize: 14, color: Colors.textMuted },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    fontSize: 14,
    color: Colors.text,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.royalBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.textMuted,
    opacity: 0.6,
  },
});
