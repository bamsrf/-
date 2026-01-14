/**
 * Экран поиска по Discogs
 */
import { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { RecordGrid } from '../../components/RecordGrid';
import { useSearchStore, useCollectionStore } from '../../lib/store';
import { RecordSearchResult } from '../../lib/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchInput, setSearchInput] = useState('');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const {
    query,
    results,
    isLoading,
    hasMore,
    search,
    loadMore,
    clearResults,
  } = useSearchStore();

  const { addToCollection, addToWishlist } = useCollectionStore();

  const handleSearch = useCallback(() => {
    if (searchInput.trim()) {
      search(searchInput.trim());
    }
  }, [searchInput, search]);

  const handleClear = useCallback(() => {
    setSearchInput('');
    clearResults();
  }, [clearResults]);

  const handleRecordPress = (record: RecordSearchResult) => {
    router.push(`/record/${record.discogs_id}`);
  };

  const handleAddToCollection = async (record: RecordSearchResult) => {
    const id = record.discogs_id;
    if (processingIds.has(id)) return; // Блокируем повторные нажатия
    
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await addToCollection(id);
      Alert.alert('Готово!', `"${record.title}" добавлена в коллекцию`);
    } catch (error: any) {
      const status = error?.response?.status;
      const detail = error?.response?.data?.detail;
      const url = error?.config?.url;
      const message = `Status: ${status}\nDetail: ${detail}\nURL: ${url}\n\n${error?.message || ''}`;
      Alert.alert('Ошибка добавления', message);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleAddToWishlist = async (record: RecordSearchResult) => {
    const id = record.discogs_id;
    if (processingIds.has(id)) return; // Блокируем повторные нажатия
    
    setProcessingIds(prev => new Set(prev).add(id));
    try {
      await addToWishlist(id);
      Alert.alert('Готово!', `"${record.title}" добавлена в список желаний`);
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Не удалось добавить в список желаний';
      Alert.alert('Ошибка', message);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const SearchHeader = (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={searchInput}
          onChangeText={setSearchInput}
          placeholder="Артист, альбом, лейбл..."
          placeholderTextColor={Colors.textMuted}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchInput.length > 0 && (
          <TouchableOpacity onPress={handleClear}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Поиск" />
      
      <RecordGrid
        data={results}
        onRecordPress={handleRecordPress}
        onAddToCollection={handleAddToCollection}
        onAddToWishlist={handleAddToWishlist}
        showActions
        isLoading={isLoading}
        onEndReached={hasMore ? loadMore : undefined}
        emptyMessage={
          query
            ? 'Ничего не найдено. Попробуйте изменить запрос.'
            : 'Введите название альбома, артиста или лейбла'
        }
        ListHeaderComponent={SearchHeader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchContainer: {
    paddingBottom: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
  },
});
