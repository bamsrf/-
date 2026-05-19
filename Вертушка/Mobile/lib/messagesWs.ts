/**
 * WebSocket-клиент DM с реконнектом и экспоненциальным backoff.
 *
 * Подключаемся при наличии access-токена; auth — через query-параметр.
 * Слушатели подписываются на события типа `message.new`, `message.read`,
 * `message.deleted`, `typing`.
 */
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import type { Message, MessageReaction } from './messagesTypes';

const TOKEN_KEY = 'auth_token';

const API_BASE_URL = __DEV__
  ? (Constants.expoConfig?.extra?.devApiUrl ?? 'http://localhost:8000/api')
  : 'https://api.vinyl-vertushka.ru/api';

function toWsUrl(httpUrl: string): string {
  return httpUrl.replace(/^http/, 'ws');
}

export type WsEvent =
  | {
      type: 'message.new';
      conversation_id: string;
      message: Message;
    }
  | {
      type: 'message.read';
      conversation_id: string;
      reader_id: string;
      up_to_message_id: string;
      last_read_at: string | null;
    }
  | {
      type: 'message.deleted';
      conversation_id: string;
      message_id: string;
    }
  | {
      type: 'message.reaction';
      conversation_id: string;
      message_id: string;
      user_id: string;
      emoji: string;
      added: boolean;
      reactions: MessageReaction[];
    }
  | {
      type: 'typing';
      conversation_id: string;
      user_id: string;
    };

type Listener = (e: WsEvent) => void;

class MessagesSocket {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private connectedListeners = new Set<(connected: boolean) => void>();
  private wantConnected = false;

  async connect() {
    this.wantConnected = true;
    let token: string | null = null;
    try {
      // SecureStore на iOS требует разлоченный девайс ("User interaction is not
      // allowed"). На локскрине/фоне keychain недоступен — тогда просто откладываем
      // подключение до следующего цикла backoff.
      token = await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      this.scheduleReconnect();
      return;
    }
    if (!token) {
      this.scheduleReconnect();
      return;
    }
    const url = `${toWsUrl(API_BASE_URL)}/messages/ws?token=${encodeURIComponent(token)}`;
    try {
      this.ws = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws.onopen = () => {
      this.backoffMs = 1000;
      this.notifyConnected(true);
    };
    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as WsEvent;
        this.listeners.forEach((l) => {
          try {
            l(event);
          } catch {
            /* listener errors don't kill the bus */
          }
        });
      } catch {
        // тихо
      }
    };
    this.ws.onclose = () => {
      this.notifyConnected(false);
      if (this.wantConnected) this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      try {
        this.ws?.close();
      } catch {
        // тихо
      }
    };
  }

  disconnect() {
    this.wantConnected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    try {
      this.ws?.close();
    } catch {
      // тихо
    }
    this.ws = null;
    this.notifyConnected(false);
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = this.backoffMs;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
      this.connect();
    }, delay);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onConnected(fn: (connected: boolean) => void): () => void {
    this.connectedListeners.add(fn);
    fn(this.ws?.readyState === WebSocket.OPEN);
    return () => this.connectedListeners.delete(fn);
  }

  private notifyConnected(connected: boolean) {
    this.connectedListeners.forEach((l) => l(connected));
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  sendTyping(conversationId: string) {
    if (!this.isOpen()) return;
    try {
      this.ws?.send(JSON.stringify({ type: 'typing', conversation_id: conversationId }));
    } catch {
      // тихо
    }
  }
}

export const messagesSocket = new MessagesSocket();
