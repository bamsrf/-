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
  /** ISO datetime — last_read_at собеседника, для отрисовки ✓✓ на своих сообщениях. */
  partner_last_read_at?: string | null;
  /** Закреплено пользователем (Telegram-style). */
  pinned?: boolean;
}

export interface ReplyPreview {
  id: string;
  sender_id: string;
  body: string | null;
  deleted_at: string | null;
}

export interface AttachedRecord {
  id: string;
  title: string;
  artist: string;
  year: number | null;
  cover_image_url: string | null;
  cover_url: string | null;
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
  reply_to_message_id?: string | null;
  reply_to?: ReplyPreview | null;
  attached_record_id?: string | null;
  attached_record?: AttachedRecord | null;
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

export interface PresenceInfo {
  online: boolean;
  last_seen_at: string | null;
}
