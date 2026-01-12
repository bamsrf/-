/**
 * API клиент для Вертушка Backend
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  User,
  VinylRecord,
  RecordSearchResponse,
  RecordSearchResult,
  Collection,
  CollectionItem,
  Wishlist,
  WishlistItem,
  SearchFilters,
} from './types';

// API сервер
// Для тестирования через Expo Go используем продакшен API
const API_BASE_URL = 'https://api.vinyl-vertushka.ru/api';

// Для локальной разработки с бэкендом на localhost:
// const API_BASE_URL = __DEV__ 
//   ? 'http://192.168.1.66:8000/api'  // Локальный IP для тестирования
//   : 'https://api.vinyl-vertushka.ru/api'; // Продакшен сервер

const TOKEN_KEY = 'auth_token';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Интерцептор для добавления токена
    this.client.interceptors.request.use(async (config) => {
      const token = await this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Интерцептор для обработки ошибок
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          this.removeToken();
        }
        return Promise.reject(error);
      }
    );
  }

  // ==================== Token Management ====================

  async getToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }

  async removeToken(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  // ==================== Auth ====================

  async login(data: LoginRequest): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/auth/login', {
      email: data.email,
      password: data.password,
    });
    
    await this.setToken(response.data.access_token);
    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/auth/register', data);
    
    // Сохраняем токен сразу после регистрации
    await this.setToken(response.data.access_token);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.removeToken();
  }

  async getMe(): Promise<User> {
    const response = await this.client.get<User>('/users/me');
    return response.data;
  }

  // ==================== Records ====================

  async searchRecords(
    query: string,
    filters?: SearchFilters,
    page = 1,
    perPage = 20
  ): Promise<RecordSearchResponse> {
    const params: { [key: string]: any } = {
      q: query,
      page,
      per_page: perPage,
    };

    if (filters?.artist) params.artist = filters.artist;
    if (filters?.year) params.year = filters.year;
    if (filters?.label) params.label = filters.label;

    const response = await this.client.get<RecordSearchResponse>('/records/search', { params });
    return response.data;
  }

  async scanBarcode(barcode: string): Promise<RecordSearchResult[]> {
    const response = await this.client.post<RecordSearchResult[]>(
      '/records/scan/barcode',
      null,
      { params: { barcode } }
    );
    return response.data;
  }

  async getRecord(id: string): Promise<VinylRecord> {
    const response = await this.client.get<VinylRecord>(`/records/${id}`);
    return response.data;
  }

  async getRecordByDiscogsId(discogsId: string): Promise<VinylRecord> {
    const response = await this.client.get<VinylRecord>(`/records/discogs/${discogsId}`);
    return response.data;
  }

  // ==================== Collections ====================

  async getCollections(): Promise<Collection[]> {
    const response = await this.client.get<Collection[]>('/collections');
    return response.data;
  }

  async createCollection(data: { name: string; description?: string }): Promise<Collection> {
    const response = await this.client.post<Collection>('/collections', data);
    return response.data;
  }

  async getCollection(id: string): Promise<Collection> {
    const response = await this.client.get<Collection>(`/collections/${id}`);
    return response.data;
  }

  async getCollectionItems(collectionId: string): Promise<CollectionItem[]> {
    const response = await this.client.get<CollectionItem[]>(
      `/collections/${collectionId}/items`
    );
    return response.data;
  }

  async addToCollection(
    collectionId: string,
    discogsId: string,
    data?: { condition?: string; notes?: string; purchase_price?: number }
  ): Promise<CollectionItem> {
    const response = await this.client.post<CollectionItem>(
      `/collections/${collectionId}/items`,
      { discogs_id: discogsId, ...data }
    );
    return response.data;
  }

  async removeFromCollection(collectionId: string, itemId: string): Promise<void> {
    await this.client.delete(`/collections/${collectionId}/items/${itemId}`);
  }

  // ==================== Wishlists ====================

  async getWishlist(): Promise<Wishlist> {
    const response = await this.client.get<Wishlist>('/wishlists');
    return response.data;
  }

  async getWishlistItems(): Promise<WishlistItem[]> {
    const response = await this.client.get<WishlistItem[]>('/wishlists/items');
    return response.data;
  }

  async addToWishlist(
    discogsId: string,
    data?: { priority?: number; notes?: string }
  ): Promise<WishlistItem> {
    const response = await this.client.post<WishlistItem>('/wishlists/items', {
      discogs_id: discogsId,
      ...data,
    });
    return response.data;
  }

  async removeFromWishlist(itemId: string): Promise<void> {
    await this.client.delete(`/wishlists/items/${itemId}`);
  }

  async moveToCollection(wishlistItemId: string, collectionId: string): Promise<CollectionItem> {
    const response = await this.client.post<CollectionItem>(
      `/wishlists/items/${wishlistItemId}/move-to-collection`,
      { collection_id: collectionId }
    );
    return response.data;
  }

  async getPublicWishlistUrl(): Promise<string> {
    const response = await this.client.get<{ url: string }>('/wishlists/public-url');
    return response.data.url;
  }
}

export const api = new ApiClient();
export default api;
