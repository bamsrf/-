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
// Для локальной разработки с бэкендом на localhost:
const API_BASE_URL = __DEV__
  ? 'http://192.168.0.180:8000/api'  // Локальный IP для разработки (работает на симуляторе и физическом устройстве)
  : 'https://api.vinyl-vertushka.ru/api'; // Продакшен сервер

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 60000, // 60 секунд — бэкенд может долго запрашивать Discogs API
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Интерцептор для добавления токена и логирования
    this.client.interceptors.request.use(async (config) => {
      const token = await this.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Debug logging
      console.log('🔑 Request:', {
        method: config.method,
        url: config.url,
        hasAuthHeader: !!config.headers.Authorization,
        authHeaderPreview: config.headers.Authorization 
          ? `${String(config.headers.Authorization).substring(0, 40)}...` 
          : null,
      });
      return config;
    });

    // Интерцептор для обработки ошибок и автообновления токена
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        
        // Если 401 и это не запрос на refresh — пробуем обновить токен
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // Ждём пока токен обновится
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                resolve(this.client(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            if (newToken) {
              this.refreshSubscribers.forEach((callback) => callback(newToken));
              this.refreshSubscribers = [];
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.client(originalRequest);
            }
          } catch {
            // Refresh не удался — разлогиниваем
            await this.removeTokens();
          } finally {
            this.isRefreshing = false;
          }
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

  async getRefreshToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.setToken(accessToken);
    await this.setRefreshToken(refreshToken);
  }

  async removeTokens(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }

  async removeToken(): Promise<void> {
    await this.removeTokens();
  }

  private async refreshToken(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await axios.post<AuthTokens>(`${API_BASE_URL}/auth/refresh`, {
        refresh_token: refreshToken,
      });
      
      await this.setTokens(response.data.access_token, response.data.refresh_token || refreshToken);
      return response.data.access_token;
    } catch {
      return null;
    }
  }

  // ==================== Auth ====================

  async login(data: LoginRequest): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/auth/login', {
      email: data.email,
      password: data.password,
    });
    
    // Сохраняем оба токена
    await this.setTokens(response.data.access_token, response.data.refresh_token || '');
    return response.data;
  }

  async register(data: RegisterRequest): Promise<AuthTokens> {
    const response = await this.client.post<AuthTokens>('/auth/register', data);
    
    // Сохраняем оба токена сразу после регистрации
    await this.setTokens(response.data.access_token, response.data.refresh_token || '');
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
    const response = await this.client.get<Collection[]>('/collections/');
    return response.data;
  }

  async createCollection(data: { name: string; description?: string }): Promise<Collection> {
    const response = await this.client.post<Collection>('/collections/', data);
    return response.data;
  }

  async getCollection(id: string): Promise<Collection> {
    const response = await this.client.get<Collection>(`/collections/${id}`);
    return response.data;
  }

  async getCollectionItems(collectionId: string): Promise<CollectionItem[]> {
    // Бэкенд возвращает коллекцию с items внутри через GET /collections/{id}
    const collection = await this.getCollection(collectionId);
    return collection.items || [];
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
    console.log('🔴 API.removeFromCollection:', { collectionId, itemId });
    try {
      // Используем новый endpoint для удаления конкретного элемента по item_id
      const response = await this.client.delete(`/collections/${collectionId}/items/${itemId}`);
      console.log('✅ API.removeFromCollection: success', response.status);
    } catch (error: any) {
      console.error('❌ API.removeFromCollection: error', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  }

  // ==================== Wishlists ====================

  async getWishlist(): Promise<Wishlist> {
    const response = await this.client.get<Wishlist>('/wishlists/');
    return response.data;
  }

  async getWishlistItems(): Promise<WishlistItem[]> {
    // Бэкенд возвращает wishlist с items внутри через GET /wishlists
    const wishlist = await this.getWishlist();
    return wishlist.items || [];
  }

  async addToWishlist(
    discogsId: string,
    data?: { priority?: number; notes?: string }
  ): Promise<WishlistItem> {
    console.log('💜 API.addToWishlist: START', { discogsId, data });
    try {
      const response = await this.client.post<WishlistItem>('/wishlists/items', {
        discogs_id: discogsId,
        ...data,
      });
      console.log('✅ API.addToWishlist: SUCCESS', { status: response.status, data: response.data });
      return response.data;
    } catch (error: any) {
      console.error('❌ API.addToWishlist: ERROR', {
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  }

  async addToWishlistByRecordId(
    recordId: string,
    data?: { priority?: number; notes?: string }
  ): Promise<WishlistItem> {
    console.log('💜 API.addToWishlistByRecordId: START', { recordId, data });
    try {
      const response = await this.client.post<WishlistItem>('/wishlists/items', {
        record_id: recordId,
        ...data,
      });
      console.log('✅ API.addToWishlistByRecordId: SUCCESS', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ API.addToWishlistByRecordId: ERROR', {
        status: error?.response?.status,
        data: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  }

  async removeFromWishlist(itemId: string): Promise<void> {
    // Бэкенд использует /wishlists/records/{item_id}
    await this.client.delete(`/wishlists/records/${itemId}`);
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
