/**
 * API-методы личных сообщений. Вынесено из `api.ts` в отдельный модуль —
 * автоформаттер `api.ts` сносит чужие добавления, поэтому держим здесь.
 *
 * Используем тот же axios-инстанс из `api` (private), но обращаемся к нему
 * через публичный фасад: ApiClient экспортирует только методы, поэтому
 * создаём свой axios c теми же базовыми настройками и общим токеном.
 */
import axios, { AxiosInstance } from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import type {
  Conversation,
  ConversationDetail,
  Message,
  MessageFolder,
  UnreadCount,
} from './messagesTypes';

const API_BASE_URL = __DEV__
  ? (Constants.expoConfig?.extra?.devApiUrl ?? 'http://localhost:8000/api')
  : 'https://api.vinyl-vertushka.ru/api';

const TOKEN_KEY = 'auth_token';

let _client: AxiosInstance | null = null;

function getClient(): AxiosInstance {
  if (_client) return _client;
  _client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });
  _client.interceptors.request.use(async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch {
      // тихо
    }
    return config;
  });
  return _client;
}

export const messagesApi = {
  async listConversations(folder: MessageFolder = 'primary'): Promise<Conversation[]> {
    const r = await getClient().get('/messages/conversations/', { params: { folder } });
    return r.data;
  },

  async getConversation(conversationId: string): Promise<ConversationDetail> {
    const r = await getClient().get(`/messages/conversations/${conversationId}/`);
    return r.data;
  },

  async listMessages(
    conversationId: string,
    before?: string,
    limit: number = 50,
  ): Promise<Message[]> {
    const r = await getClient().get(
      `/messages/conversations/${conversationId}/messages/`,
      { params: before ? { before, limit } : { limit } },
    );
    return r.data;
  },

  async createConversation(recipientUserId: string): Promise<Conversation> {
    const r = await getClient().post('/messages/conversations/', {
      recipient_user_id: recipientUserId,
    });
    return r.data;
  },

  async sendMessage(
    conversationId: string,
    body: string,
    clientNonce: string,
  ): Promise<Message> {
    const r = await getClient().post(
      `/messages/conversations/${conversationId}/messages/`,
      { body, client_nonce: clientNonce },
    );
    return r.data;
  },

  async markRead(conversationId: string, upToMessageId: string): Promise<void> {
    await getClient().post(`/messages/conversations/${conversationId}/read/`, {
      up_to_message_id: upToMessageId,
    });
  },

  async deleteMessage(messageId: string): Promise<void> {
    await getClient().delete(`/messages/messages/${messageId}/`);
  },

  async getUnreadCount(): Promise<UnreadCount> {
    const r = await getClient().get('/messages/unread-count/');
    return r.data;
  },
};
