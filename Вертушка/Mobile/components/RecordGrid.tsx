/**
 * Сетка пластинок
 */
import React from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { RecordCard } from './RecordCard';
import { RecordSearchResult, VinylRecord, CollectionItem, WishlistItem } from '../lib/types';
import { Colors, Typography, Spacing } from '../constants/theme';

type RecordItem = RecordSearchResult | VinylRecord | CollectionItem | WishlistItem;

interface RecordGridProps<T extends RecordItem = RecordItem> {
  data: T[];
  onRecordPress?: (record: T) => void;
  onAddToCollection?: (record: T) => void;
  onAddToWishlist?: (record: T) => void;
  showActions?: boolean;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  emptyMessage?: string;
  ListHeaderComponent?: React.ReactElement;
}

export function RecordGrid<T extends RecordItem = RecordItem>({
  data,
  onRecordPress,
  onAddToCollection,
  onAddToWishlist,
  showActions = false,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onEndReached,
  emptyMessage = 'Пластинок пока нет',
  ListHeaderComponent,
}: RecordGridProps<T>) {
  // Извлекаем запись из разных типов
  const getRecord = (item: RecordItem): RecordSearchResult | VinylRecord => {
    if ('record' in item) {
      return item.record;
    }
    return item;
  };

  const renderItem = ({ item }: { item: T }) => {
    const record = getRecord(item);
    
    return (
      <RecordCard
        record={record}
        onPress={onRecordPress ? () => onRecordPress(item) : undefined}
        onAddToCollection={
          onAddToCollection ? () => onAddToCollection(item) : undefined
        }
        onAddToWishlist={
          onAddToWishlist ? () => onAddToWishlist(item) : undefined
        }
        showActions={showActions}
      />
    );
  };

  const renderEmpty = () => {
    if (isLoading) return null;
    
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || data.length === 0) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  };

  const keyExtractor = (item: T, index: number) => {
    if ('id' in item) return item.id;
    const record = getRecord(item);
    if ('discogs_id' in record && record.discogs_id) return record.discogs_id;
    return index.toString();
  };

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  row: {
    justifyContent: 'space-between',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export default RecordGrid;
