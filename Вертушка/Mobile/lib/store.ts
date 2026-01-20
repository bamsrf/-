/**
 * Zustand Store для Вертушка
 */
import { create } from 'zustand';
import { api } from './api';
import {
  User,
  VinylRecord,
  RecordSearchResult,
  Collection,
  CollectionItem,
  WishlistItem,
  CollectionTab,
  SearchFilters,
} from './types';

// ==================== Auth Store ====================

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      await api.login({ email, password });
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (email, username, password) => {
    set({ isLoading: true });
    try {
      // Регистрация сразу возвращает токен и сохраняет его
      await api.register({ email, username, password });
      // Получаем данные пользователя
      const user = await api.getMe();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await api.logout();
    set({ user: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      const token = await api.getToken();
      if (token) {
        const user = await api.getMe();
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));

// ==================== Search Store ====================

interface SearchState {
  query: string;
  filters: SearchFilters;
  results: RecordSearchResult[];
  isLoading: boolean;
  page: number;
  totalResults: number;
  hasMore: boolean;

  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  search: (query?: string) => Promise<void>;
  loadMore: () => Promise<void>;
  clearResults: () => void;
}

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  filters: {},
  results: [],
  isLoading: false,
  page: 1,
  totalResults: 0,
  hasMore: false,

  setQuery: (query) => set({ query }),
  
  setFilters: (filters) => set({ filters }),

  search: async (newQuery) => {
    const query = newQuery ?? get().query;
    if (!query.trim()) {
      set({ results: [], totalResults: 0, hasMore: false });
      return;
    }

    set({ isLoading: true, query, page: 1 });
    try {
      const response = await api.searchRecords(query, get().filters, 1);
      set({
        results: response.results,
        totalResults: response.total,
        hasMore: response.results.length < response.total,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  loadMore: async () => {
    const { query, filters, page, hasMore, isLoading, results } = get();
    if (!hasMore || isLoading) return;

    set({ isLoading: true });
    try {
      const nextPage = page + 1;
      const response = await api.searchRecords(query, filters, nextPage);
      set({
        results: [...results, ...response.results],
        page: nextPage,
        hasMore: results.length + response.results.length < response.total,
        isLoading: false,
      });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  clearResults: () => set({ results: [], query: '', page: 1, totalResults: 0, hasMore: false }),
}));

// ==================== Collection Store ====================

interface CollectionState {
  activeTab: CollectionTab;
  collections: Collection[];
  defaultCollection: Collection | null;
  collectionItems: CollectionItem[];
  wishlistItems: WishlistItem[];
  isLoading: boolean;

  // Actions
  setActiveTab: (tab: CollectionTab) => void;
  fetchCollections: () => Promise<void>;
  fetchCollectionItems: () => Promise<void>;
  fetchWishlistItems: () => Promise<void>;
  addToCollection: (discogsId: string) => Promise<void>;
  addToWishlist: (discogsId: string) => Promise<void>;
  removeFromCollection: (itemId: string) => Promise<void>;
  removeFromWishlist: (itemId: string) => Promise<void>;
  moveToCollection: (wishlistItemId: string) => Promise<void>;
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  activeTab: 'collection',
  collections: [],
  defaultCollection: null,
  collectionItems: [],
  wishlistItems: [],
  isLoading: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchCollections: async () => {
    console.log('🔵 fetchCollections: start');
    set({ isLoading: true });
    try {
      const token = await api.getToken();
      console.log('🔵 fetchCollections: token exists:', !!token);
      
      const collections = await api.getCollections();
      console.log('🔵 fetchCollections: success, count:', collections.length);
      
      // Используем первую коллекцию по sort_order как дефолтную
      const sortedCollections = [...collections].sort((a, b) => a.sort_order - b.sort_order);
      const defaultCollection = sortedCollections[0] || null;
      set({ collections, defaultCollection, isLoading: false });
    } catch (error: any) {
      console.log('❌ fetchCollections error:', {
        message: error?.message,
        status: error?.response?.status,
        data: error?.response?.data,
      });
      set({ isLoading: false });
      throw error;
    }
  },

  fetchCollectionItems: async () => {
    const { defaultCollection } = get();
    console.log('🔵 fetchCollectionItems:', { hasDefaultCollection: !!defaultCollection, collectionId: defaultCollection?.id });
    if (!defaultCollection) return;

    set({ isLoading: true });
    try {
      const items = await api.getCollectionItems(defaultCollection.id);
      console.log('🔵 fetchCollectionItems: loaded', items.length, 'items');
      items.slice(0, 3).forEach((item, index) => {
        console.log(`🔵 Item ${index}:`, {
          id: item.id,
          collection_id: item.collection_id,
          record_id: item.record_id,
          recordId: (item as any).recordId,
        });
      });
      set({ collectionItems: items, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  fetchWishlistItems: async () => {
    set({ isLoading: true });
    try {
      const items = await api.getWishlistItems();
      set({ wishlistItems: items, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  addToCollection: async (discogsId) => {
    let { defaultCollection, collections, fetchCollectionItems, fetchWishlistItems } = get();

    console.log('🔵 addToCollection: start', {
      discogsId,
      hasDefaultCollection: !!defaultCollection,
      collectionsCount: collections.length,
    });

    // Если нет коллекций - создаём первую
    if (!defaultCollection) {
      if (collections.length === 0) {
        console.log('🔵 addToCollection: creating default collection...');
        // Создаём коллекцию по умолчанию
        await api.createCollection({ name: 'Моя коллекция' });
        await get().fetchCollections();
        defaultCollection = get().defaultCollection;
      }

      if (!defaultCollection) {
        throw new Error('Не удалось создать коллекцию');
      }
    }

    console.log('🔵 addToCollection: adding to collection', defaultCollection.id);
    await api.addToCollection(defaultCollection.id, discogsId);

    // Обновляем ОБА списка, т.к. сервер мог автоматически удалить из вишлиста
    await Promise.all([
      fetchCollectionItems(),
      fetchWishlistItems()
    ]);

    console.log('✅ addToCollection: success');
  },

  addToWishlist: async (discogsId) => {
    if (!discogsId) {
      throw new Error('Не указан ID пластинки');
    }
    await api.addToWishlist(discogsId);
    await get().fetchWishlistItems();
  },

  removeFromCollection: async (itemId) => {
    const { defaultCollection, fetchCollectionItems } = get();

    console.log('🗑️ removeFromCollection:', { collectionId: defaultCollection?.id, itemId });

    if (!defaultCollection || !itemId) {
      console.error('❌ removeFromCollection: missing collectionId or itemId');
      throw new Error('Не указана коллекция или элемент');
    }

    // API ожидает item_id (ID конкретного элемента CollectionItem)
    await api.removeFromCollection(defaultCollection.id, itemId);
    await fetchCollectionItems();
  },

  removeFromWishlist: async (itemId) => {
    await api.removeFromWishlist(itemId);
    await get().fetchWishlistItems();
  },

  moveToCollection: async (wishlistItemId) => {
    const { defaultCollection, fetchCollectionItems, fetchWishlistItems } = get();
    if (!defaultCollection) {
      throw new Error('Коллекция не найдена');
    }

    // Используем атомарный endpoint
    await api.moveToCollection(wishlistItemId, defaultCollection.id);

    // Обновляем оба списка
    await Promise.all([
      fetchCollectionItems(),
      fetchWishlistItems(),
    ]);
  },

}));

// ==================== Scanner Store ====================

interface ScannerState {
  scannedBarcode: string | null;
  scanResults: RecordSearchResult[];
  isScanning: boolean;
  isLoading: boolean;

  // Actions
  setScannedBarcode: (barcode: string | null) => void;
  searchByBarcode: (barcode: string) => Promise<void>;
  clearScan: () => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  scannedBarcode: null,
  scanResults: [],
  isScanning: false,
  isLoading: false,

  setScannedBarcode: (barcode) => set({ scannedBarcode: barcode }),

  searchByBarcode: async (barcode) => {
    set({ isLoading: true, scannedBarcode: barcode });
    try {
      const results = await api.scanBarcode(barcode);
      set({ scanResults: results, isLoading: false });
    } catch (error) {
      set({ isLoading: false, scanResults: [] });
      throw error;
    }
  },

  clearScan: () => set({ scannedBarcode: null, scanResults: [] }),
}));
