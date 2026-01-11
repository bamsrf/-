/**
 * Экран коллекции с переключателем Моё / Хочу
 */
import { useEffect, useCallback } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Header } from '../../components/Header';
import { RecordGrid } from '../../components/RecordGrid';
import { SegmentedControl } from '../../components/ui';
import { useCollectionStore } from '../../lib/store';
import { CollectionItem, WishlistItem, CollectionTab } from '../../lib/types';
import { Colors, Spacing } from '../../constants/theme';

const SEGMENTS: { key: CollectionTab; label: string }[] = [
  { key: 'collection', label: 'Моё' },
  { key: 'wishlist', label: 'Хочу' },
];

export default function CollectionScreen() {
  const router = useRouter();

  const {
    activeTab,
    collectionItems,
    wishlistItems,
    isLoading,
    setActiveTab,
    fetchCollections,
    fetchCollectionItems,
    fetchWishlistItems,
    removeFromCollection,
    removeFromWishlist,
    moveToCollection,
  } = useCollectionStore();

  // Загрузка данных при монтировании
  useEffect(() => {
    fetchCollections().then(() => {
      fetchCollectionItems();
      fetchWishlistItems();
    });
  }, []);

  const handleRefresh = useCallback(async () => {
    if (activeTab === 'collection') {
      await fetchCollectionItems();
    } else {
      await fetchWishlistItems();
    }
  }, [activeTab, fetchCollectionItems, fetchWishlistItems]);

  const handleRecordPress = (item: CollectionItem | WishlistItem) => {
    // Предпочитаем discogs_id для навигации, если он есть
    const recordId = item.record.discogs_id || item.record.id;
    router.push(`/record/${recordId}`);
  };

  const handleRemoveFromCollection = async (item: CollectionItem) => {
    Alert.alert(
      'Удалить из коллекции?',
      `"${item.record.title}" будет удалена из вашей коллекции`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromCollection(item.id);
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить из коллекции');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFromWishlist = async (item: WishlistItem) => {
    Alert.alert(
      'Удалить из списка?',
      `"${item.record.title}" будет удалена из списка желаний`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromWishlist(item.id);
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось удалить из списка');
            }
          },
        },
      ]
    );
  };

  const handleMoveToCollection = async (item: WishlistItem) => {
    Alert.alert(
      'Купил!',
      `Перенести "${item.record.title}" в коллекцию?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Перенести',
          onPress: async () => {
            try {
              await moveToCollection(item.id);
              Alert.alert('Готово!', 'Пластинка добавлена в коллекцию');
            } catch (error) {
              Alert.alert('Ошибка', 'Не удалось перенести в коллекцию');
            }
          },
        },
      ]
    );
  };

  const data = activeTab === 'collection' ? collectionItems : wishlistItems;

  const SegmentHeader = (
    <View style={styles.segmentContainer}>
      <SegmentedControl
        segments={SEGMENTS}
        selectedKey={activeTab}
        onSelect={setActiveTab}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Header title="Коллекция" />

      <RecordGrid
        data={data}
        onRecordPress={handleRecordPress}
        isLoading={isLoading}
        isRefreshing={isLoading}
        onRefresh={handleRefresh}
        emptyMessage={
          activeTab === 'collection'
            ? 'Ваша коллекция пуста.\nОтсканируйте или найдите пластинку, чтобы добавить.'
            : 'Список желаний пуст.\nДобавьте пластинки, которые хотите приобрести.'
        }
        ListHeaderComponent={SegmentHeader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  segmentContainer: {
    paddingBottom: Spacing.md,
  },
});
