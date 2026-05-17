/**
 * Zustand-стор личных сообщений. Вынесен из `store.ts` в отдельный файл,
 * чтобы избежать конфликтов авто-линтера `store.ts`.
 *
 * Содержит:
 * - список диалогов primary / requests
 * - сообщения каждого треда с оптимистичным UI и идемпотентностью по client_nonce
 * - openOrCreate — get-or-create диалога с пользователем
 * - refreshUnread — фоновый счётчик непрочитанного
 */
import { create } from 'zustand';
import { messagesApi } from './messagesApi';
import { useAuthStore } from './store';
import { toast } from './toast';
import type {
  Conversation,
  Message,
  MessageFolder,
  UnreadCount,
} from './messagesTypes';

interface MessagesState {
  conversationsPrimary: Conversation[];
  conversationsRequests: Conversation[];
  threads: Record<string, Message[]>;
  hasMoreBefore: Record<string, boolean>;
  unread: UnreadCount;
  isLoadingList: boolean;
  isLoadingThread: Record<string, boolean>;

  loadConversations: (folder: MessageFolder) => Promise<void>;
  loadThread: (conversationId: string) => Promise<void>;
  loadMore: (conversationId: string) => Promise<void>;
  send: (conversationId: string, body: string) => Promise<Message | null>;
  retrySend: (conversationId: string, localId: string) => Promise<void>;
  markRead: (conversationId: string) => Promise<void>;
  refreshUnread: () => Promise<void>;
  openOrCreate: (recipientUserId: string) => Promise<Conversation>;
  acceptRequest: (conversationId: string) => Promise<void>;
  rejectRequest: (conversationId: string) => Promise<void>;
  toggleMute: (conversationId: string) => Promise<void>;
  archive: (conversationId: string) => Promise<void>;
  clearHistory: (conversationId: string) => Promise<void>;
  blockUser: (userId: string, conversationId?: string) => Promise<void>;
  togglePin: (conversationId: string) => Promise<void>;
  reset: () => void;
}

function makeMessageNonce(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function upsertConversation(list: Conversation[], conv: Conversation): Conversation[] {
  const idx = list.findIndex((c) => c.id === conv.id);
  if (idx === -1) return [conv, ...list];
  const next = [...list];
  next[idx] = conv;
  return next;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversationsPrimary: [],
  conversationsRequests: [],
  threads: {},
  hasMoreBefore: {},
  unread: { primary: 0, requests: 0 },
  isLoadingList: false,
  isLoadingThread: {},

  loadConversations: async (folder) => {
    set({ isLoadingList: true });
    try {
      const items = await messagesApi.listConversations(folder);
      if (folder === 'primary') set({ conversationsPrimary: items });
      else set({ conversationsRequests: items });
    } catch (e) {
      console.warn('loadConversations failed', e);
    } finally {
      set({ isLoadingList: false });
    }
  },

  loadThread: async (conversationId) => {
    set((s) => ({ isLoadingThread: { ...s.isLoadingThread, [conversationId]: true } }));
    try {
      const detail = await messagesApi.getConversation(conversationId);
      set((s) => {
        const existing = s.threads[conversationId] ?? [];
        const localPending = existing.filter(
          (m) =>
            m.id.startsWith('local-') &&
            !detail.messages.some(
              (sm) => sm.client_nonce && sm.client_nonce === m.client_nonce
            )
        );
        const serverMessages = detail.messages.map<Message>((m) => {
          const wasLocal = existing.find(
            (e) => e.client_nonce && e.client_nonce === m.client_nonce
          );
          return wasLocal ? { ...m, _local_status: 'sent' } : m;
        });
        const merged = [...serverMessages, ...localPending].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        return {
          threads: { ...s.threads, [conversationId]: merged },
          hasMoreBefore: {
            ...s.hasMoreBefore,
            [conversationId]: detail.messages.length >= 50,
          },
          conversationsPrimary:
            detail.conversation.request_status === 'accepted'
              ? upsertConversation(s.conversationsPrimary, detail.conversation)
              : s.conversationsPrimary,
          conversationsRequests:
            detail.conversation.request_status === 'pending'
              ? upsertConversation(s.conversationsRequests, detail.conversation)
              : s.conversationsRequests,
        };
      });
    } catch (e) {
      console.warn('loadThread failed', e);
    } finally {
      set((s) => ({
        isLoadingThread: { ...s.isLoadingThread, [conversationId]: false },
      }));
    }
  },

  loadMore: async (conversationId) => {
    const existing = get().threads[conversationId] ?? [];
    if (existing.length === 0) return;
    const oldest = existing.find((m) => !m.id.startsWith('local-'));
    if (!oldest) return;
    try {
      const older = await messagesApi.listMessages(conversationId, oldest.id, 50);
      set((s) => ({
        threads: {
          ...s.threads,
          [conversationId]: [...older, ...(s.threads[conversationId] ?? [])],
        },
        hasMoreBefore: {
          ...s.hasMoreBefore,
          [conversationId]: older.length >= 50,
        },
      }));
    } catch (e) {
      console.warn('loadMore failed', e);
    }
  },

  send: async (conversationId, body) => {
    const text = body.trim();
    if (!text) return null;
    const me = useAuthStore.getState().user;
    if (!me) return null;

    const nonce = makeMessageNonce();
    const localId = `local-${nonce}`;
    const optimistic: Message = {
      id: localId,
      conversation_id: conversationId,
      sender_id: me.id,
      body: text,
      created_at: new Date().toISOString(),
      edited_at: null,
      deleted_at: null,
      client_nonce: nonce,
      _local_status: 'sending',
    };
    set((s) => ({
      threads: {
        ...s.threads,
        [conversationId]: [...(s.threads[conversationId] ?? []), optimistic],
      },
    }));

    try {
      const saved = await messagesApi.sendMessage(conversationId, text, nonce);
      set((s) => ({
        threads: {
          ...s.threads,
          [conversationId]: (s.threads[conversationId] ?? []).map((m) =>
            m.id === localId ? { ...saved, _local_status: 'sent' } : m
          ),
        },
        conversationsPrimary: s.conversationsPrimary.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                last_message_preview: text.slice(0, 160),
                last_message_at: saved.created_at,
                last_message_sender_id: me.id,
              }
            : c
        ),
      }));
      return saved;
    } catch (e: any) {
      set((s) => ({
        threads: {
          ...s.threads,
          [conversationId]: (s.threads[conversationId] ?? []).map((m) =>
            m.id === localId ? { ...m, _local_status: 'failed' } : m
          ),
        },
      }));
      const detail = e?.response?.data?.detail;
      if (detail) toast.error('Не отправлено', String(detail));
      return null;
    }
  },

  retrySend: async (conversationId, localId) => {
    const list = get().threads[conversationId] ?? [];
    const target = list.find((m) => m.id === localId);
    if (!target || !target.body || !target.client_nonce) return;
    set((s) => ({
      threads: {
        ...s.threads,
        [conversationId]: (s.threads[conversationId] ?? []).map((m) =>
          m.id === localId ? { ...m, _local_status: 'sending' } : m
        ),
      },
    }));
    try {
      const saved = await messagesApi.sendMessage(
        conversationId,
        target.body,
        target.client_nonce
      );
      set((s) => ({
        threads: {
          ...s.threads,
          [conversationId]: (s.threads[conversationId] ?? []).map((m) =>
            m.id === localId ? { ...saved, _local_status: 'sent' } : m
          ),
        },
      }));
    } catch {
      set((s) => ({
        threads: {
          ...s.threads,
          [conversationId]: (s.threads[conversationId] ?? []).map((m) =>
            m.id === localId ? { ...m, _local_status: 'failed' } : m
          ),
        },
      }));
    }
  },

  markRead: async (conversationId) => {
    const messages = get().threads[conversationId] ?? [];
    const last = [...messages].reverse().find((m) => !m.id.startsWith('local-'));
    if (!last) return;
    try {
      await messagesApi.markRead(conversationId, last.id);
      set((s) => ({
        conversationsPrimary: s.conversationsPrimary.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ),
        conversationsRequests: s.conversationsRequests.map((c) =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ),
      }));
      get().refreshUnread();
    } catch (e) {
      console.warn('markRead failed', e);
    }
  },

  refreshUnread: async () => {
    try {
      const u = await messagesApi.getUnreadCount();
      set({ unread: u });
    } catch {
      // тихо — фоновый запрос
    }
  },

  openOrCreate: async (recipientUserId) => {
    const conv = await messagesApi.createConversation(recipientUserId);
    set((s) => ({
      conversationsPrimary:
        conv.request_status === 'accepted'
          ? upsertConversation(s.conversationsPrimary, conv)
          : s.conversationsPrimary,
      conversationsRequests:
        conv.request_status === 'pending'
          ? upsertConversation(s.conversationsRequests, conv)
          : s.conversationsRequests,
    }));
    return conv;
  },

  acceptRequest: async (conversationId) => {
    try {
      await messagesApi.acceptConversation(conversationId);
      set((s) => {
        const req = s.conversationsRequests.find((c) => c.id === conversationId);
        if (!req) return s;
        const accepted: Conversation = { ...req, request_status: 'accepted' };
        return {
          conversationsRequests: s.conversationsRequests.filter((c) => c.id !== conversationId),
          conversationsPrimary: upsertConversation(s.conversationsPrimary, accepted),
        };
      });
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const status = e?.response?.status;
      if (status === 404) {
        toast.error(
          'Не удалось принять',
          'Сервер ещё не задеплоен с новым эндпоинтом. Обновите бекенд.',
        );
      } else {
        toast.error('Не удалось принять', String(detail || 'Попробуйте позже'));
      }
      throw e;
    }
  },

  rejectRequest: async (conversationId) => {
    try {
      await messagesApi.rejectConversation(conversationId);
      set((s) => ({
        conversationsRequests: s.conversationsRequests.filter((c) => c.id !== conversationId),
      }));
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      const status = e?.response?.status;
      if (status === 404) {
        toast.error(
          'Не удалось отклонить',
          'Сервер ещё не задеплоен с новым эндпоинтом.',
        );
      } else {
        toast.error('Не удалось отклонить', String(detail || 'Попробуйте позже'));
      }
      throw e;
    }
  },

  toggleMute: async (conversationId) => {
    try {
      const { muted } = await messagesApi.toggleMute(conversationId);
      set((s) => ({
        conversationsPrimary: s.conversationsPrimary.map((c) =>
          c.id === conversationId ? { ...c, muted } : c
        ),
        conversationsRequests: s.conversationsRequests.map((c) =>
          c.id === conversationId ? { ...c, muted } : c
        ),
      }));
    } catch (e: any) {
      toast.error('Не удалось', String(e?.response?.data?.detail || 'Попробуйте позже'));
    }
  },

  archive: async (conversationId) => {
    try {
      await messagesApi.archiveConversation(conversationId);
      set((s) => ({
        conversationsPrimary: s.conversationsPrimary.filter((c) => c.id !== conversationId),
        conversationsRequests: s.conversationsRequests.filter((c) => c.id !== conversationId),
      }));
    } catch (e: any) {
      toast.error('Не удалось удалить', String(e?.response?.data?.detail || 'Попробуйте позже'));
      throw e;
    }
  },

  clearHistory: async (conversationId) => {
    try {
      await messagesApi.clearHistory(conversationId);
      set((s) => ({
        threads: { ...s.threads, [conversationId]: [] },
      }));
    } catch (e: any) {
      toast.error('Не удалось очистить', String(e?.response?.data?.detail || 'Попробуйте позже'));
    }
  },

  blockUser: async (userId, conversationId) => {
    try {
      await messagesApi.blockUser(userId);
      if (conversationId) {
        set((s) => ({
          conversationsPrimary: s.conversationsPrimary.filter((c) => c.id !== conversationId),
          conversationsRequests: s.conversationsRequests.filter((c) => c.id !== conversationId),
        }));
      }
    } catch (e: any) {
      toast.error('Не удалось заблокировать', String(e?.response?.data?.detail || 'Попробуйте позже'));
      throw e;
    }
  },

  togglePin: async (conversationId) => {
    try {
      const { pinned } = await messagesApi.togglePin(conversationId);
      set((s) => ({
        conversationsPrimary: s.conversationsPrimary.map((c) =>
          c.id === conversationId ? { ...c, pinned } : c
        ),
      }));
    } catch (e: any) {
      toast.error(
        'Не удалось закрепить',
        String(e?.response?.data?.detail || 'Попробуйте позже'),
      );
    }
  },

  reset: () =>
    set({
      conversationsPrimary: [],
      conversationsRequests: [],
      threads: {},
      hasMoreBefore: {},
      unread: { primary: 0, requests: 0 },
      isLoadingList: false,
      isLoadingThread: {},
    }),
}));
