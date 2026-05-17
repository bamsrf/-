/**
 * Типы личных сообщений. Вынесены в отдельный файл от `types.ts`, чтобы
 * автоматический форматтер `types.ts` не сносил эти определения.
 */
export type MessageFolder = 'primary' | 'requests';
export type RequestStatus = 'accepted' | 'pending';

export interface ConversationPartner {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface Conversation {
  id: string;
  partner: ConversationPartner;
  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_sender_id: string | null;
  unread_count: number;
  muted: boolean;
  request_status: RequestStatus;
  is_blocked: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  client_nonce: string | null;
  /** Локальный клиентский статус. На сервере не хранится. */
  _local_status?: 'sending' | 'sent' | 'failed';
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: Message[];
}

export interface UnreadCount {
  primary: number;
  requests: number;
}
