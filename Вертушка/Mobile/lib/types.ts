/**
 * TypeScript типы для Вертушка
 */

// ==================== User ====================

export interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

// ==================== VinylRecord (Пластинка) ====================

export interface VinylRecord {
  id: string;
  discogs_id?: string;
  discogs_master_id?: string;
  title: string;
  artist: string;
  label?: string;
  catalog_number?: string;
  year?: number;
  country?: string;
  genre?: string;
  style?: string;
  format_type?: string;
  format_description?: string;
  barcode?: string;
  estimated_price_min?: number;
  estimated_price_max?: number;
  estimated_price_median?: number;
  price_currency: string;
  cover_image_url?: string;
  thumb_image_url?: string;
  tracklist?: Track[];
  created_at: string;
  updated_at: string;
}

export interface Track {
  position: string;
  title: string;
  duration?: string;
}

export interface RecordSearchResult {
  discogs_id: string;
  title: string;
  artist: string;
  label?: string;
  year?: number;
  country?: string;
  cover_image_url?: string;
  thumb_image_url?: string;
  format_type?: string;
}

export interface RecordSearchResponse {
  results: RecordSearchResult[];
  total: number;
  page: number;
  per_page: number;
}

// ==================== Collection ====================

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  sort_order: number;
  items_count: number;
  items?: CollectionItem[];
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  id: string;
  collection_id: string;
  record_id: string;
  record: VinylRecord;
  condition?: string;
  notes?: string;
  purchase_price?: number;
  purchase_date?: string;
  added_at: string;
}

// ==================== Wishlist ====================

export interface Wishlist {
  id: string;
  user_id: string;
  share_token?: string;
  is_public: boolean;
  show_gifter_names?: boolean;
  custom_message?: string;
  items?: WishlistItem[];
  created_at: string;
  updated_at: string;
}

export interface WishlistItem {
  id: string;
  wishlist_id: string;
  record_id: string;
  record: VinylRecord;
  priority?: number;
  notes?: string;
  added_at: string;
}

// ==================== API Response ====================

export interface ApiError {
  detail: string;
  status_code?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

// ==================== App State ====================

export type CollectionTab = 'collection' | 'wishlist';

// Статус пластинки в системе (взаимоисключающие состояния)
export type RecordStatus =
  | 'not_added'      // Нигде не добавлена
  | 'in_collection'  // В коллекции (может быть несколько копий)
  | 'in_wishlist';   // В вишлисте

export interface SearchFilters {
  artist?: string;
  year?: number;
  label?: string;
  genre?: string;
}
