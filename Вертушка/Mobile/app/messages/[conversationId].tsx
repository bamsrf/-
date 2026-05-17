/**
 * Экран одного диалога (V2.3).
 *
 * - Группировка сообщений того же sender ≤5 минут (Telegram-style).
 * - Date-разделители («Сегодня», «Вчера», конкретная дата).
 * - Read-receipt галочки на своих сообщениях.
 * - Composer: paperclip (заглушка под share record), TextInput до 5 строк,
 *   круглая send-кнопка с плавным переходом disabled ↔ active.
 * - Empty state: карточка с аватаркой собеседника.
 *
 * Поллинг 8с пока экран открыт (заменится на WS в M2).
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
  ListRenderItem,
  ActionSheetIOS,
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { useAuthStore } from '../../lib/store';
import { useMessagesStore } from '../../lib/messagesStore';
import { resolveMediaUrl } from '../../lib/api';
import { messagesApi } from '../../lib/messagesApi';
import type {
  AttachedRecord,
  Conversation,
  Message,
  PresenceInfo,
} from '../../lib/messagesTypes';

const POLL_INTERVAL_MS = 8000;
const PRESENCE_INTERVAL_MS = 30_000;
const GROUP_GAP_MS = 5 * 60 * 1000; // сообщения подряд того же sender → одна группа
const EMPTY_MESSAGES: Message[] = [];

function formatLastSeen(iso: string | null): string {
  if (!iso) return 'был(а) в сети давно';
  const d = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - d.getTime()) / 60_000);
  if (diffMin < 1) return 'был(а) только что';
  if (diffMin < 60) return `был(а) ${diffMin} мин назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `был(а) ${diffH} ч назад`;
  return `был(а) ${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}`;
}

function formatBubbleTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(d: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86_400_000);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (target.getTime() === today.getTime()) return 'Сегодня';
  if (target.getTime() === yesterday.getTime()) return 'Вчера';

  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: sameYear ? undefined : 'numeric',
  });
}

type FeedItem =
  | { type: 'date'; key: string; date: Date }
  | {
      type: 'message';
      key: string;
      message: Message;
      isMine: boolean;
      isLastInGroup: boolean;
      isFirstInGroup: boolean;
    };

function buildFeed(messages: Message[], meId: string | null): FeedItem[] {
  if (messages.length === 0) return [];
  const sorted = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const items: FeedItem[] = [];
  let prevDayKey: string | null = null;
  let prevMsg: Message | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const m = sorted[i];
    const date = new Date(m.created_at);
    const dayKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    if (dayKey !== prevDayKey) {
      items.push({ type: 'date', key: `date-${dayKey}`, date });
      prevDayKey = dayKey;
      prevMsg = null;
    }

    const isMine = !!meId && m.sender_id === meId;
    const isFirstInGroup =
      !prevMsg ||
      prevMsg.sender_id !== m.sender_id ||
      new Date(m.created_at).getTime() - new Date(prevMsg.created_at).getTime() > GROUP_GAP_MS;

    const next = sorted[i + 1];
    const isLastInGroup =
      !next ||
      next.sender_id !== m.sender_id ||
      new Date(next.created_at).getTime() - new Date(m.created_at).getTime() > GROUP_GAP_MS;

    items.push({
      type: 'message',
      key: m.id,
      message: m,
      isMine,
      isFirstInGroup,
      isLastInGroup,
    });
    prevMsg = m;
  }
  return items;
}

function ReadMark({
  status,
  isRead,
}: {
  status: Message['_local_status'];
  isRead: boolean;
}) {
  if (status === 'sending') {
    return <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" />;
  }
  // Двойная галка — собеседник прочитал; одинарная — отправлено.
  if (isRead) {
    return (
      <View style={{ flexDirection: 'row' }}>
        <Icon name="check" size={12} color="#7AE2FF" />
        <View style={{ marginLeft: -6 }}>
          <Icon name="check" size={12} color="#7AE2FF" />
        </View>
      </View>
    );
  }
  return <Icon name="check" size={12} color="rgba(255,255,255,0.75)" />;
}

function MessageBubble({
  message,
  isMine,
  isLastInGroup,
  isRead,
  isSelected,
  selectionMode,
  onLongPress,
  onPress,
  onReplyHint,
}: {
  message: Message;
  isMine: boolean;
  isLastInGroup: boolean;
  isRead: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  onLongPress: () => void;
  onPress: () => void;
  onReplyHint?: () => void;
}) {
  if (message.deleted_at) {
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowOther]}>
        <View style={[styles.bubble, styles.bubbleDeleted]}>
          <Text style={styles.bubbleDeletedTxt}>Сообщение удалено</Text>
        </View>
      </View>
    );
  }

  const isFailed = message._local_status === 'failed';

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onLongPress={isMine ? onLongPress : undefined}
      onPress={
        selectionMode && isMine
          ? onPress
          : onReplyHint
      }
      style={[
        styles.bubbleRow,
        isMine ? styles.bubbleRowMine : styles.bubbleRowOther,
        isSelected && styles.bubbleRowSelected,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isMine ? styles.bubbleMine : styles.bubbleOther,
          isMine && !isLastInGroup && { borderBottomRightRadius: 18 },
          !isMine && !isLastInGroup && { borderBottomLeftRadius: 18 },
          isSelected && styles.bubbleSelected,
        ]}
      >
        {message.reply_to ? (
          <View
            style={[
              styles.bubbleReply,
              isMine ? styles.bubbleReplyMineLine : styles.bubbleReplyOtherLine,
            ]}
          >
            <Text
              numberOfLines={2}
              style={[
                styles.bubbleReplyText,
                isMine ? styles.bubbleReplyTextMine : styles.bubbleReplyTextOther,
              ]}
            >
              {message.reply_to.deleted_at ? 'Сообщение удалено' : message.reply_to.body}
            </Text>
          </View>
        ) : null}
        {message.attached_record ? (
          <View
            style={[
              styles.bubbleRecord,
              isMine ? styles.bubbleRecordMine : styles.bubbleRecordOther,
            ]}
          >
            {message.attached_record.cover_image_url ? (
              <Image
                source={resolveMediaUrl(message.attached_record.cover_image_url)}
                style={styles.bubbleRecordCover}
                cachePolicy="disk"
              />
            ) : (
              <View
                style={[
                  styles.bubbleRecordCover,
                  { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.05)' },
                ]}
              >
                <Icon name="disc" size={18} color={Colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                style={[
                  styles.bubbleRecordTitle,
                  { color: isMine ? '#fff' : Colors.text },
                ]}
                numberOfLines={1}
              >
                {message.attached_record.title}
              </Text>
              <Text
                style={[
                  styles.bubbleRecordSub,
                  { color: isMine ? 'rgba(255,255,255,0.75)' : Colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {message.attached_record.artist}
                {message.attached_record.year ? ` · ${message.attached_record.year}` : ''}
              </Text>
            </View>
          </View>
        ) : null}
        <Text style={[styles.bubbleBody, isMine && styles.bubbleBodyMine]}>
          {message.body}
        </Text>
        {isLastInGroup ? (
          <View style={styles.bubbleMeta}>
            <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
              {formatBubbleTime(message.created_at)}
            </Text>
            {isMine && !isFailed ? (
              <ReadMark status={message._local_status} isRead={isRead} />
            ) : null}
            {isMine && isFailed ? (
              <Icon name="warning" size={12} color="#FCD2D4" />
            ) : null}
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function DateDivider({ date }: { date: Date }) {
  return (
    <View style={styles.dateDivider}>
      <View style={styles.dateChip}>
        <Text style={styles.dateChipTxt}>{formatDateLabel(date)}</Text>
      </View>
    </View>
  );
}

function EmptyState({ partner }: { partner: Conversation['partner'] | null }) {
  if (!partner) {
    return (
      <View style={styles.emptyConv}>
        <ActivityIndicator size="small" color={Colors.royalBlue} />
      </View>
    );
  }
  const initials = partner.username.slice(0, 2).toUpperCase();
  return (
    <View style={styles.emptyConv}>
      <View style={styles.emptyAvatar}>
        {partner.avatar_url ? (
          <Image
            source={resolveMediaUrl(partner.avatar_url)}
            style={{ width: 72, height: 72, borderRadius: 36 }}
            cachePolicy="disk"
          />
        ) : (
          <LinearGradient
            colors={[Colors.royalBlue, Colors.periwinkle]}
            style={{
              width: 72,
              height: 72,
              borderRadius: 36,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={styles.emptyAvatarTxt}>{initials}</Text>
          </LinearGradient>
        )}
      </View>
      <Text style={styles.emptyName}>
        {partner.display_name || `@${partner.username}`}
      </Text>
      <Text style={styles.emptyHint}>Это начало вашей беседы</Text>
    </View>
  );
}

export default function ConversationScreen() {
  const params = useLocalSearchParams<{
    conversationId: string;
    attach_record_id?: string;
    attach_title?: string;
    attach_artist?: string;
    attach_year?: string;
    attach_cover?: string;
  }>();
  const { conversationId } = params;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);

  const messages = useMessagesStore(
    (s) => s.threads[conversationId ?? ''] ?? EMPTY_MESSAGES
  );
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
  const toggleMute = useMessagesStore((s) => s.toggleMute);
  const clearHistory = useMessagesStore((s) => s.clearHistory);
  const archive = useMessagesStore((s) => s.archive);
  const blockUser = useMessagesStore((s) => s.blockUser);

  const [draft, setDraft] = useState('');
  const [partner, setPartner] = useState<Conversation['partner'] | null>(
    conversation?.partner ?? null
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [presence, setPresence] = useState<PresenceInfo | null>(null);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [attachedRecord, setAttachedRecord] = useState<AttachedRecord | null>(null);
  const listRef = useRef<FlatList<FeedItem>>(null);

  // Когда возвращаемся со share-record экрана с params — подхватим выбор
  useEffect(() => {
    if (params.attach_record_id && params.attach_title && params.attach_artist) {
      setAttachedRecord({
        id: params.attach_record_id,
        title: params.attach_title,
        artist: params.attach_artist,
        year: params.attach_year ? Number(params.attach_year) : null,
        cover_image_url: params.attach_cover || null,
        cover_url: null,
      });
      // очистим query чтобы не повторно срабатывало
      router.setParams({
        attach_record_id: '',
        attach_title: '',
        attach_artist: '',
        attach_year: '',
        attach_cover: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.attach_record_id]);

  const selectionMode = selected.size > 0;
  const partnerLastReadAt = conversation?.partner_last_read_at
    ? new Date(conversation.partner_last_read_at).getTime()
    : 0;

  const toggleSelection = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const handleDeleteSelected = useCallback(() => {
    if (!conversationId || selected.size === 0) return;
    const count = selected.size;
    Alert.alert(
      'Удалить сообщения?',
      `Удалить ${count} ${count === 1 ? 'сообщение' : count < 5 ? 'сообщения' : 'сообщений'} у всех?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const ids = Array.from(selected);
            await Promise.all(
              ids.map((id) =>
                messagesApi.deleteMessage(id).catch(() => null),
              ),
            );
            clearSelection();
            loadThread(conversationId);
          },
        },
      ],
    );
  }, [conversationId, selected, clearSelection, loadThread]);

  useEffect(() => {
    if (conversation?.partner) setPartner(conversation.partner);
  }, [conversation?.partner]);

  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      try {
        const detail = await messagesApi.getConversation(conversationId);
        setPartner(detail.conversation.partner);
        await loadThread(conversationId);
      } catch {
        // молча
      }
    })();
  }, [conversationId, loadThread]);

  useEffect(() => {
    if (!conversationId) return undefined;
    let timer: ReturnType<typeof setInterval> | null = null;
    let appState: AppStateStatus = AppState.currentState;

    const start = () => {
      if (timer) return;
      timer = setInterval(() => loadThread(conversationId), POLL_INTERVAL_MS);
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

  useEffect(() => {
    if (!conversationId || messages.length === 0) return;
    if (!conversation || conversation.unread_count === 0) return;
    markRead(conversationId);
  }, [conversationId, messages.length, conversation, markRead]);

  // Presence: подгружаем статус собеседника каждые 30с пока экран открыт.
  useEffect(() => {
    if (!partner?.id) return undefined;
    let cancelled = false;
    const refresh = async () => {
      try {
        const p = await messagesApi.getPresence(partner.id);
        if (!cancelled) setPresence(p);
      } catch {
        // тихо
      }
    };
    refresh();
    const t = setInterval(refresh, PRESENCE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [partner?.id]);

  const feed = useMemo(() => buildFeed(messages, me?.id ?? null), [messages, me?.id]);

  const handleSend = useCallback(async () => {
    if (!conversationId) return;
    const text = draft.trim() || (attachedRecord ? '📀 пластинка' : '');
    if (!text && !attachedRecord) return;
    const rt = replyTo?.id ?? null;
    const ar = attachedRecord;
    setDraft('');
    setReplyTo(null);
    setAttachedRecord(null);
    await sendMessage(conversationId, text, rt, ar);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [conversationId, draft, replyTo, attachedRecord, sendMessage]);

  const handleRetry = useCallback(
    (msg: Message) => {
      if (!conversationId) return;
      retrySend(conversationId, msg.id);
    },
    [conversationId, retrySend]
  );

  const openBubbleMenu = useCallback(
    (m: Message, isMine: boolean) => {
      const baseOptions = ['Ответить', 'Скопировать'];
      const options = isMine
        ? [...baseOptions, 'Удалить', 'Отмена']
        : [...baseOptions, 'Отмена'];
      const cancel = options.length - 1;
      const destructive = isMine ? 2 : undefined;

      const exec = (i: number) => {
        if (i === 0) setReplyTo(m);
        else if (i === 1 && m.body) Clipboard.setStringAsync(m.body);
        else if (isMine && i === 2) {
          Alert.alert('Удалить сообщение?', 'Удаление видно у обеих сторон.', [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Удалить',
              style: 'destructive',
              onPress: async () => {
                try {
                  await messagesApi.deleteMessage(m.id);
                  if (conversationId) loadThread(conversationId);
                } catch {
                  // тихо
                }
              },
            },
          ]);
        }
      };

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          { options, cancelButtonIndex: cancel, destructiveButtonIndex: destructive },
          exec,
        );
      } else {
        const buttons: any[] = [
          { text: 'Ответить', onPress: () => exec(0) },
          { text: 'Скопировать', onPress: () => exec(1) },
        ];
        if (isMine)
          buttons.push({ text: 'Удалить', style: 'destructive', onPress: () => exec(2) });
        buttons.push({ text: 'Отмена', style: 'cancel' });
        Alert.alert('Действия', undefined, buttons);
      }
    },
    [conversationId, loadThread],
  );

  const renderItem: ListRenderItem<FeedItem> = useCallback(
    ({ item }) => {
      if (item.type === 'date') return <DateDivider date={item.date} />;
      const m = item.message;
      const isFailed = m._local_status === 'failed';
      const isRead =
        item.isMine &&
        partnerLastReadAt > 0 &&
        new Date(m.created_at).getTime() <= partnerLastReadAt;
      const isSelected = selected.has(m.id);

      if (isFailed && !selectionMode) {
        return (
          <TouchableOpacity activeOpacity={0.8} onPress={() => handleRetry(m)}>
            <MessageBubble
              message={m}
              isMine={item.isMine}
              isLastInGroup={item.isLastInGroup}
              isRead={isRead}
              isSelected={isSelected}
              selectionMode={selectionMode}
              onLongPress={() => toggleSelection(m.id)}
              onPress={() => toggleSelection(m.id)}
            />
            <Text style={styles.failedHint}>Не отправлено — нажмите, чтобы повторить</Text>
          </TouchableOpacity>
        );
      }
      return (
        <MessageBubble
          message={m}
          isMine={item.isMine}
          isLastInGroup={item.isLastInGroup}
          isRead={isRead}
          isSelected={isSelected}
          selectionMode={selectionMode}
          onLongPress={() => toggleSelection(m.id)}
          onPress={() => toggleSelection(m.id)}
          onReplyHint={() => openBubbleMenu(m, item.isMine)}
        />
      );
    },
    [handleRetry, partnerLastReadAt, selected, selectionMode, toggleSelection, openBubbleMenu]
  );

  const headerName = useMemo(() => {
    if (!partner) return '';
    return partner.display_name || `@${partner.username}`;
  }, [partner]);

  const partnerInitials = (partner?.username ?? '').slice(0, 2).toUpperCase();
  const canSend = !!draft.trim();
  const isMuted = !!conversation?.muted;

  const handleMenu = useCallback(() => {
    if (!conversationId || !partner) return;
    const muteLabel = isMuted ? 'Включить уведомления' : 'Отключить уведомления';
    const options = [muteLabel, 'Очистить историю', `Заблокировать @${partner.username}`, 'Удалить диалог', 'Отмена'];
    const cancel = 4;
    const destructive = [2, 3];

    const exec = (i: number) => {
      if (i === 0) toggleMute(conversationId);
      else if (i === 1) {
        Alert.alert('Очистить историю?', 'Сообщения будут скрыты у вас, у собеседника останутся.', [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Очистить', style: 'destructive', onPress: () => clearHistory(conversationId) },
        ]);
      } else if (i === 2) {
        Alert.alert(
          `Заблокировать @${partner.username}?`,
          'Вы не сможете обмениваться сообщениями. Диалог исчезнет у вас.',
          [
            { text: 'Отмена', style: 'cancel' },
            {
              text: 'Заблокировать',
              style: 'destructive',
              onPress: async () => {
                await blockUser(partner.id, conversationId);
                router.back();
              },
            },
          ],
        );
      } else if (i === 3) {
        archive(conversationId).then(() => router.back());
      }
    };

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: cancel, destructiveButtonIndex: destructive },
        exec,
      );
    } else {
      Alert.alert(`@${partner.username}`, undefined, [
        { text: muteLabel, onPress: () => exec(0) },
        { text: 'Очистить историю', style: 'destructive', onPress: () => exec(1) },
        { text: `Заблокировать @${partner.username}`, style: 'destructive', onPress: () => exec(2) },
        { text: 'Удалить диалог', style: 'destructive', onPress: () => exec(3) },
        { text: 'Отмена', style: 'cancel' },
      ]);
    }
  }, [conversationId, partner, isMuted, toggleMute, clearHistory, archive, blockUser, router]);

  return (
    <View style={styles.container}>
      {/* Header — обычный, или action-bar при selection */}
      {selectionMode ? (
        <View style={[styles.topbar, styles.topbarSelection, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity onPress={clearSelection} style={styles.iconBtn}>
            <Icon name="close" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.selectionCount}>{selected.size}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={handleDeleteSelected} style={styles.iconBtn}>
            <Icon name="trash" size={20} color="#E5484D" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.topbar, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Icon name="arrow-left" size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.partnerWrap}
            onPress={() => {
              if (partner) router.push(`/user/${partner.username}` as any);
            }}
            disabled={!partner}
          >
            {partner ? (
              <View style={styles.partnerAvatarWrap}>
                {partner.avatar_url ? (
                  <Image
                    source={resolveMediaUrl(partner.avatar_url)}
                    style={styles.partnerAvatarImg}
                    cachePolicy="disk"
                  />
                ) : (
                  <LinearGradient
                    colors={[Colors.royalBlue, Colors.periwinkle]}
                    style={styles.partnerAvatarImg}
                  >
                    <Text style={styles.partnerAvatarTxt}>{partnerInitials}</Text>
                  </LinearGradient>
                )}
              </View>
            ) : (
              <View style={[styles.partnerAvatarWrap, styles.partnerAvatarSkeleton]} />
            )}
            <View style={styles.partnerTextWrap}>
              <Text style={styles.partnerName} numberOfLines={1}>
                {partner ? headerName : 'Загрузка…'}
              </Text>
              {partner && presence ? (
                <View style={styles.partnerStatusRow}>
                  {presence.online ? (
                    <>
                      <View style={styles.onlineDot} />
                      <Text style={styles.partnerStatusOnline}>в сети</Text>
                    </>
                  ) : (
                    <Text style={styles.partnerStatus}>
                      {formatLastSeen(presence.last_seen_at)}
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleMenu}
            style={styles.iconBtn}
            disabled={!partner}
          >
            <Icon name="ellipsis-horizontal" size={20} color={Colors.text} />
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.kbWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 52 : 0}
      >
        <FlatList
          ref={listRef}
          data={feed}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          contentContainerStyle={feed.length === 0 ? styles.listEmpty : styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          onLayout={() => listRef.current?.scrollToEnd({ animated: false })}
          onEndReachedThreshold={0.1}
          onStartReached={() => conversationId && loadMore(conversationId)}
          ListEmptyComponent={isLoading ? null : <EmptyState partner={partner} />}
          keyboardShouldPersistTaps="handled"
        />

        {attachedRecord ? (
          <View style={styles.attachBar}>
            {attachedRecord.cover_image_url ? (
              <Image
                source={resolveMediaUrl(attachedRecord.cover_image_url)}
                style={styles.attachCover}
                cachePolicy="disk"
              />
            ) : (
              <View style={[styles.attachCover, styles.attachCoverPlaceholder]}>
                <Icon name="disc" size={16} color={Colors.textMuted} />
              </View>
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.attachTitle} numberOfLines={1}>
                {attachedRecord.title}
              </Text>
              <Text style={styles.attachSub} numberOfLines={1}>
                {attachedRecord.artist}
                {attachedRecord.year ? ` · ${attachedRecord.year}` : ''}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setAttachedRecord(null)}
              style={styles.replyClose}
            >
              <Icon name="close" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        {replyTo ? (
          <View style={styles.replyBar}>
            <View style={styles.replyLine} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.replyTitle}>
                {replyTo.sender_id === me?.id
                  ? 'Ответ себе'
                  : `Ответ ${partner ? `@${partner.username}` : ''}`}
              </Text>
              <Text style={styles.replyBody} numberOfLines={1}>
                {replyTo.deleted_at ? 'Сообщение удалено' : replyTo.body}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyTo(null)} style={styles.replyClose}>
              <Icon name="close" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={styles.attachBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (!conversationId) return;
              router.push({
                pathname: '/messages/share-record' as any,
                params: { conversationId },
              });
            }}
          >
            <Icon name="disc" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
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
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <Icon
              name="arrow-up"
              size={18}
              color={canSend ? '#fff' : Colors.textMuted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  kbWrap: { flex: 1 },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  topbarSelection: {
    backgroundColor: Colors.surface,
  },
  selectionCount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 4,
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
  partnerAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarSkeleton: { backgroundColor: Colors.surface },
  partnerAvatarTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  partnerTextWrap: { flex: 1, minWidth: 0 },
  partnerName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  partnerStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  partnerStatus: { fontSize: 11, color: Colors.textMuted },
  partnerStatusOnline: { fontSize: 11, color: '#30A46C', fontWeight: '500' },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#30A46C',
  },

  list: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.md },
  listEmpty: { flexGrow: 1, justifyContent: 'center' },

  /* Date divider */
  dateDivider: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  dateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(154,168,255,0.15)',
  },
  dateChipTxt: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.royalBlue,
    letterSpacing: 0.2,
  },

  /* Bubble */
  bubbleRow: { width: '100%', marginVertical: 1 },
  bubbleRowMine: { alignItems: 'flex-end' },
  bubbleRowOther: { alignItems: 'flex-start' },
  bubbleRowSelected: {
    backgroundColor: 'rgba(59,75,245,0.06)',
  },
  bubbleSelected: {
    borderWidth: 2,
    borderColor: Colors.royalBlue,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
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
    gap: 5,
    marginTop: 2,
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

  /* Empty state */
  emptyConv: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    gap: 8,
  },
  emptyAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    marginBottom: 4,
    shadowColor: Colors.royalBlue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  emptyAvatarTxt: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  emptyName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  emptyHint: { fontSize: 13, color: Colors.textMuted },

  /* Attach (record) preview над composer */
  attachBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  attachCover: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: Colors.surface,
  },
  attachCoverPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  attachTitle: { fontSize: 13, fontWeight: '600', color: Colors.text },
  attachSub: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },

  /* Attached-record card внутри bubble */
  bubbleRecord: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
    padding: 6,
    borderRadius: 10,
  },
  bubbleRecordMine: { backgroundColor: 'rgba(255,255,255,0.18)' },
  bubbleRecordOther: { backgroundColor: 'rgba(59,75,245,0.08)' },
  bubbleRecordCover: { width: 44, height: 44, borderRadius: 4 },
  bubbleRecordTitle: { fontSize: 13, fontWeight: '600' },
  bubbleRecordSub: { fontSize: 11, marginTop: 1 },

  /* Reply preview над composer */
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  replyLine: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    backgroundColor: Colors.royalBlue,
  },
  replyTitle: { fontSize: 12, fontWeight: '600', color: Colors.royalBlue },
  replyBody: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  replyClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },

  /* Reply preview внутри bubble */
  bubbleReply: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginBottom: 6,
    paddingLeft: 8,
    borderLeftWidth: 3,
  },
  bubbleReplyMineLine: { borderLeftColor: 'rgba(255,255,255,0.7)' },
  bubbleReplyOtherLine: { borderLeftColor: Colors.royalBlue },
  bubbleReplyText: { fontSize: 12, lineHeight: 16 },
  bubbleReplyTextMine: { color: 'rgba(255,255,255,0.85)' },
  bubbleReplyTextOther: { color: Colors.textMuted },

  /* Composer */
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
  attachBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
