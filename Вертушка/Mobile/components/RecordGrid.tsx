/**
 * Сетка пластинок
 */
import React, { memo } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { RecordCard } from './RecordCard';
import { RecordSearchResult, VinylRecord, CollectionItem, WishlistItem, MasterSearchResult, ReleaseSearchResult } from '../lib/types';
import { Colors, Typography, Spacing, BorderRadius, Gradients, Shadows } from '../constants/theme';
import { RarityContext } from './RarityAura';

export interface EmptyAction {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

type RecordItem = RecordSearchResult | VinylRecord | CollectionItem | WishlistItem | MasterSearchResult | ReleaseSearchResult;

interface RecordGridProps<T extends RecordItem = RecordItem> {
  data: T[];
  onRecordPress?: (record: T) => void;
  onArtistPress?: (artistName: string) => void;
  onAddToCollection?: (record: T) => void;
  onAddToWishlist?: (record: T) => void;
  onRemove?: (record: T) => void;
  showActions?: boolean;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onEndReached?: () => void;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyIcon?: keyof typeof Ionicons.glyphMap;
  emptyActions?: EmptyAction[];
  ListHeaderComponent?: React.ReactElement;
  isSelectionMode?: boolean;
  selectedItems?: Set<string>;
  onToggleItemSelection?: (itemId: string) => void;
  onLongPressItem?: (itemId: string) => void;
  cardVariant?: 'compact' | 'expanded' | 'list';
  numColumns?: number;
  /** Drives rarity tier selection — `collection` hides "Популярно". */
  rarityContext?: RarityContext;
}

function RecordGridComponent<T extends RecordItem = RecordItem>({
  data,
  onRecordPress,
  onArtistPress,
  onAddToCollection,
  onAddToWishlist,
  onRemove,
  showActions = false,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onEndReached,
  emptyMessage = 'Пластинок пока нет',
  emptyTitle,
  emptyIcon,
  emptyActions,
  ListHeaderComponent,
  isSelectionMode = false,
  selectedItems = new Set(),
  onToggleItemSelection,
  onLongPressItem,
  cardVariant = 'expanded',
  numColumns = 2,
  rarityContext = 'search',
}: RecordGridProps<T>) {
  // Извлекаем запись из разных типов
  const getRecord = (item: RecordItem): RecordSearchResult | VinylRecord | MasterSearchResult | ReleaseSearchResult => {
    if ('record' in item) {
      return item.record;
    }
    return item;
  };

  const renderItem = ({ item, index }: { item: T; index: number }) => {
    const record = getRecord(item);
    const itemId = 'id' in item ? item.id : '';
    const isSelected = isSelectionMode && selectedItems.has(itemId);
    const isBooked = 'is_booked' in item && item.is_booked === true;

    return (
      <Animated.View entering={FadeInUp.delay(index * 50).duration(300)}>
        <RecordCard
          record={record}
          variant={cardVariant}
          onPress={onRecordPress ? () => onRecordPress(item) : undefined}
          onArtistPress={onArtistPress}
          onAddToCollection={
            onAddToCollection ? () => onAddToCollection(item) : undefined
          }
          onAddToWishlist={
            onAddToWishlist ? () => onAddToWishlist(item) : undefined
          }
          onRemove={onRemove ? () => onRemove(item) : undefined}
          showActions={showActions && !isSelectionMode}
          isSelectionMode={isSelectionMode}
          isSelected={isSelected}
          onToggleSelection={
            onToggleItemSelection && itemId
              ? () => onToggleItemSelection(itemId)
              : undefined
          }
          onLongPress={
            onLongPressItem && itemId
              ? () => onLongPressItem(itemId)
              : undefined
          }
          isBooked={isBooked}
          rarityContext={rarityContext}
        />
      </Animated.View>
    );
  };

  const renderEmpty = () => {
    if (isLoading || !emptyMessage) return null;

    const hasRich = !!(emptyTitle || emptyIcon || (emptyActions && emptyActions.length > 0));

    if (!hasRich) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        {emptyIcon && (
          <View style={styles.emptyIconRing}>
            <Ionicons name={emptyIcon} size={36} color={Colors.royalBlue} />
          </View>
        )}
        {emptyTitle && <Text style={styles.emptyTitle}>{emptyTitle}</Text>}
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        {emptyActions && emptyActions.length > 0 && (
          <View style={styles.emptyActions}>
            {emptyActions.map((action, i) => {
              const isPrimary = i === 0;
              if (isPrimary) {
                return (
                  <TouchableOpacity
                    key={action.label}
                    onPress={action.onPress}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={Gradients.blue as [string, string]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.emptyPrimaryBtn, Shadows.sm]}
                    >
                      <Ionicons name={action.icon} size={18} color={Colors.background} />
                      <Text style={styles.emptyPrimaryText}>{action.label}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={action.label}
                  style={styles.emptySecondaryBtn}
                  onPress={action.onPress}
                  activeOpacity={0.7}
                >
                  <Ionicons name={action.icon} size={18} color={Colors.royalBlue} />
                  <Text style={styles.emptySecondaryText}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderFooter = () => {
    if (!isLoading || data.length === 0) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={Colors.royalBlue} />
      </View>
    );
  };

  const keyExtractor = (item: T, index: number) => {
    if ('id' in item) return item.id;
    const record = getRecord(item);
    if ('discogs_id' in record && record.discogs_id) return record.discogs_id;
    if ('master_id' in record && record.master_id) return record.master_id;
    if ('release_id' in record && record.release_id) return record.release_id;
    return index.toString();
  };

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      columnWrapperStyle={numColumns > 1 ? styles.row : undefined}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
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
            tintColor={Colors.royalBlue}
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyIconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h3,
    color: Colors.text,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  emptyPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
  },
  emptyPrimaryText: {
    ...Typography.bodyBold,
    color: Colors.background,
    fontSize: 15,
  },
  emptySecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  emptySecondaryText: {
    ...Typography.bodyBold,
    color: Colors.royalBlue,
    fontSize: 15,
  },
  footer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});

export const RecordGrid = memo(RecordGridComponent) as typeof RecordGridComponent;
export default RecordGrid;
