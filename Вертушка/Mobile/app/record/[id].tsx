/**
 * Экран детальной информации о пластинке
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { Button, Card, ActionSheet, ActionSheetAction } from '../../components/ui';
import { api } from '../../lib/api';
import { useCollectionStore } from '../../lib/store';
import { VinylRecord } from '../../lib/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

export default function RecordDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [record, setRecord] = useState<VinylRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const {
    addToCollection,
    addToWishlist,
    removeFromCollection,
    removeFromWishlist,
    moveToCollection,
    collectionItems,
    wishlistItems,
    fetchCollectionItems,
    fetchWishlistItems,
    fetchCollections,
  } = useCollectionStore();

  useEffect(() => {
    loadRecord();
    // Загружаем данные коллекции и вишлиста для проверки статуса
    fetchCollections().then(() => {
      fetchCollectionItems();
      fetchWishlistItems();
    });
  }, [id]);

  // Обновляем данные при возврате на экран
  useFocusEffect(
    useCallback(() => {
      fetchCollectionItems();
      fetchWishlistItems();
    }, [fetchCollectionItems, fetchWishlistItems])
  );

  // Проверяем статус пластинки (новая логика из плана)
  const getRecordStatus = (): {
    status: import('@/lib/types').RecordStatus;
    copiesCount: number;
    collectionItemId: string | null;
    wishlistItemId: string | null;
  } => {
    if (!record) {
      console.log('🔍 getRecordStatus: no record');
      return {
        status: 'not_added',
        copiesCount: 0,
        collectionItemId: null,
        wishlistItemId: null
      };
    }

    const discogsId = record.discogs_id;
    const recordId = record.id;

    console.log('🔍 getRecordStatus: searching...', {
      discogsId,
      recordId,
      collectionItemsCount: collectionItems.length,
      wishlistItemsCount: wishlistItems.length,
    });

    // Ищем все копии в коллекции
    const collectionCopies = collectionItems.filter(
      (item) => item.record.discogs_id === discogsId || item.record.id === recordId
    );

    // Ищем в вишлисте
    const wishlistItem = wishlistItems.find(
      (item) => item.record.discogs_id === discogsId || item.record.id === recordId
    );

    // ГАРАНТИЯ: сервер обеспечивает, что пластинка НЕ может быть в обоих местах
    if (collectionCopies.length > 0) {
      const status = {
        status: 'in_collection' as const,
        copiesCount: collectionCopies.length,
        collectionItemId: collectionCopies[0].id,
        wishlistItemId: null,
      };
      console.log('🔍 getRecordStatus: result =', status);
      return status;
    }

    if (wishlistItem) {
      const status = {
        status: 'in_wishlist' as const,
        copiesCount: 0,
        collectionItemId: null,
        wishlistItemId: wishlistItem.id,
      };
      console.log('🔍 getRecordStatus: result =', status);
      return status;
    }

    const status = {
      status: 'not_added' as const,
      copiesCount: 0,
      collectionItemId: null,
      wishlistItemId: null,
    };
    console.log('🔍 getRecordStatus: result =', status);
    return status;
  };

  const loadRecord = async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      // Пробуем получить по UUID, если не работает - по Discogs ID
      let data: VinylRecord;
      try {
        data = await api.getRecord(id);
      } catch {
        data = await api.getRecordByDiscogsId(id);
      }
      setRecord(data);
    } catch (err) {
      setError('Не удалось загрузить информацию о пластинке');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToCollection = async () => {
    if (!record) return;

    const recordStatus = getRecordStatus();

    // Если пластинка уже в вишлисте - переносим атомарно
    if (recordStatus.status === 'in_wishlist' && recordStatus.wishlistItemId) {
      try {
        await moveToCollection(recordStatus.wishlistItemId);
        // Немедленно обновляем UI - критически важно для правильного отображения кнопок
        await Promise.all([
          fetchCollectionItems(),
          fetchWishlistItems(),
        ]);
        Alert.alert('Готово!', 'Пластинка перенесена в коллекцию');
      } catch (error: any) {
        const message = error?.response?.data?.detail || error?.message || 'Не удалось перенести в коллекцию';
        Alert.alert('Ошибка', message);
      }
      return;
    }

    // Иначе просто добавляем в коллекцию
    const discogsId = record.discogs_id || id;
    if (!discogsId) {
      Alert.alert('Ошибка', 'Не найден идентификатор пластинки');
      return;
    }

    try {
      await addToCollection(discogsId);
      // addToCollection уже обновляет оба списка
      Alert.alert('Готово!', 'Пластинка добавлена в коллекцию');
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Не удалось добавить в коллекцию';
      Alert.alert('Ошибка', message);
    }
  };

  const handleAddToWishlist = async () => {
    console.log('💜 handleAddToWishlist: START', { hasRecord: !!record, id });

    if (!record) {
      console.log('❌ handleAddToWishlist: no record');
      return;
    }

    // Используем discogs_id если есть, иначе пробуем исходный id параметр
    const discogsId = record.discogs_id || id;
    console.log('💜 handleAddToWishlist: discogsId =', discogsId);

    if (!discogsId) {
      console.log('❌ handleAddToWishlist: no discogsId');
      Alert.alert('Ошибка', 'Не найден идентификатор пластинки');
      return;
    }

    try {
      console.log('💜 handleAddToWishlist: calling addToWishlist...');
      await addToWishlist(discogsId);
      console.log('💜 handleAddToWishlist: fetching wishlist items...');
      await fetchWishlistItems();
      console.log('✅ handleAddToWishlist: SUCCESS');
      Alert.alert('Готово!', 'Пластинка добавлена в список желаний');
    } catch (error: any) {
      console.error('❌ handleAddToWishlist: ERROR', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
      });
      const message = error?.response?.data?.detail || error?.message || 'Не удалось добавить в список желаний';
      Alert.alert('Ошибка', message);
    }
  };

  const handleRemoveFromCollection = async () => {
    const status = getRecordStatus();
    console.log('🗑️ handleRemoveFromCollection: status =', status);

    if (!status.collectionItemId) {
      console.log('❌ handleRemoveFromCollection: no collectionItemId');
      return;
    }

    Alert.alert(
      'Удалить из коллекции?',
      `"${record?.title}" будет удалена из вашей коллекции`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ handleRemoveFromCollection: removing itemId =', status.collectionItemId);
              // Передаем collectionItemId (ID конкретного элемента CollectionItem)
              await removeFromCollection(status.collectionItemId!);
              console.log('🗑️ handleRemoveFromCollection: fetching items...');
              await fetchCollectionItems();
              console.log('✅ handleRemoveFromCollection: SUCCESS');
              Alert.alert('Готово!', 'Пластинка удалена из коллекции');
            } catch (error: any) {
              console.error('❌ handleRemoveFromCollection: ERROR', error);
              Alert.alert('Ошибка', 'Не удалось удалить из коллекции');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFromWishlist = async () => {
    const status = getRecordStatus();
    if (!status.wishlistItemId) return;

    Alert.alert(
      'Удалить из списка?',
      `"${record?.title}" будет удалена из списка желаний`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromWishlist(status.wishlistItemId!);
              await fetchWishlistItems();
              Alert.alert('Готово!', 'Пластинка удалена из списка желаний');
            } catch (error: any) {
              Alert.alert('Ошибка', 'Не удалось удалить из списка');
            }
          },
        },
      ]
    );
  };

  const handleAddCopyToCollection = async () => {
    if (!record) return;
    const discogsId = record.discogs_id || id;
    if (!discogsId) {
      Alert.alert('Ошибка', 'Не найден идентификатор пластинки');
      return;
    }

    try {
      await addToCollection(discogsId);
      await fetchCollectionItems();
      Alert.alert('Готово!', 'Копия добавлена в коллекцию');
    } catch (error: any) {
      const message = error?.response?.data?.detail || error?.message || 'Не удалось добавить в коллекцию';
      Alert.alert('Ошибка', message);
    }
  };


  const getActionSheetActions = (): ActionSheetAction[] => {
    const recordStatus = getRecordStatus();
    const actions: ActionSheetAction[] = [];

    if (recordStatus.status === 'in_collection') {
      // Добавить копию (всегда доступно)
      actions.push({
        label: 'Добавить копию в коллекцию',
        icon: 'copy-outline',
        onPress: handleAddCopyToCollection,
      });

      // УБРАЛИ "Отправить в вишлист" - как в Discogs
      // Пользователь должен удалить все копии и добавить в вишлист вручную

      // Удалить эту копию
      actions.push({
        label: 'Удалить',
        icon: 'trash-outline',
        onPress: handleRemoveFromCollection,
        destructive: true,
      });
    }

    return actions;
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !record) {
    return (
      <View style={styles.container}>
        <Header title="Ошибка" showBack showProfile={false} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.errorText}>{error || 'Пластинка не найдена'}</Text>
          <Button title="Назад" onPress={() => router.back()} variant="outline" />
        </View>
      </View>
    );
  }

  const imageUrl = record.cover_image_url || record.thumb_image_url;

  return (
    <View style={styles.container}>
      <Header title="" showBack showProfile={false} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Обложка */}
        <View style={styles.coverContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Ionicons name="disc-outline" size={80} color={Colors.textMuted} />
            </View>
          )}
        </View>

        {/* Основная информация */}
        <View style={styles.infoSection}>
          <Text style={styles.artist}>{record.artist}</Text>
          <Text style={styles.title}>{record.title}</Text>

          <View style={styles.metaRow}>
            {record.year ? (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{record.year}</Text>
              </View>
            ) : null}
            {record.format_type ? (
              <View style={styles.metaItem}>
                <Ionicons name="disc-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{record.format_type}</Text>
              </View>
            ) : null}
            {record.country ? (
              <View style={styles.metaItem}>
                <Ionicons name="globe-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{record.country}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Лейбл и каталог */}
        {(record.label || record.catalog_number) && (
          <Card variant="flat" style={styles.card}>
            <Text style={styles.cardTitle}>Издание</Text>
            {record.label && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Лейбл</Text>
                <Text style={styles.detailValue}>{record.label}</Text>
              </View>
            )}
            {record.catalog_number && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Каталожный №</Text>
                <Text style={styles.detailValue}>{record.catalog_number}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Жанр */}
        {(record.genre || record.style) && (
          <Card variant="flat" style={styles.card}>
            <Text style={styles.cardTitle}>Жанр</Text>
            {record.genre && <Text style={styles.genreText}>{record.genre}</Text>}
            {record.style && (
              <Text style={styles.styleText}>{record.style}</Text>
            )}
          </Card>
        )}

        {/* Цена */}
        {record.estimated_price_median && (
          <Card variant="flat" style={styles.card}>
            <Text style={styles.cardTitle}>Оценочная стоимость</Text>
            <View style={styles.priceContainer}>
              {record.estimated_price_min && (
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Мин.</Text>
                  <Text style={styles.priceValue}>
                    ${record.estimated_price_min.toFixed(2)}
                  </Text>
                </View>
              )}
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Медиана</Text>
                <Text style={[styles.priceValue, styles.priceMedian]}>
                  ${record.estimated_price_median.toFixed(2)}
                </Text>
              </View>
              {record.estimated_price_max && (
                <View style={styles.priceItem}>
                  <Text style={styles.priceLabel}>Макс.</Text>
                  <Text style={styles.priceValue}>
                    ${record.estimated_price_max.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          </Card>
        )}

        {/* Треклист */}
        {record.tracklist && record.tracklist.length > 0 && (
          <Card variant="flat" style={styles.card}>
            <Text style={styles.cardTitle}>Треклист</Text>
            {record.tracklist.map((track, index) => (
              <View key={index} style={styles.trackRow}>
                <Text style={styles.trackPosition}>{track.position || index + 1}</Text>
                <Text style={styles.trackTitle} numberOfLines={1}>
                  {track.title}
                </Text>
                {track.duration && (
                  <Text style={styles.trackDuration}>{track.duration}</Text>
                )}
              </View>
            ))}
          </Card>
        )}
      </ScrollView>

      {/* Кнопки действий */}
      {(() => {
        const recordStatus = getRecordStatus();

        // ========== СТАТУС: В КОЛЛЕКЦИИ ==========
        if (recordStatus.status === 'in_collection') {
          return (
            <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
              <View style={styles.addedButtonContainer}>
                <View style={styles.addedButton}>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.textSecondary} />
                  <Text style={styles.addedButtonText}>
                    {recordStatus.copiesCount > 1
                      ? `Добавлено (${recordStatus.copiesCount})`
                      : 'Добавлено'
                    }
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.moreButton}
                  onPress={() => setShowActionSheet(true)}
                >
                  <Ionicons name="ellipsis-vertical" size={24} color={Colors.background} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }

        // ========== СТАТУС: В ВИШЛИСТЕ ==========
        if (recordStatus.status === 'in_wishlist') {
          return (
            <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
              <Button
                title="В коллекцию"
                onPress={handleAddToCollection}
                style={styles.actionButton}
              />
              <TouchableOpacity
                style={[styles.actionButton, styles.removeButton]}
                onPress={handleRemoveFromWishlist}
              >
                <Text style={styles.removeButtonText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          );
        }

        // ========== СТАТУС: НЕ ДОБАВЛЕНА ==========
        return (
          <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Button
              title="В коллекцию"
              onPress={handleAddToCollection}
              style={styles.actionButton}
            />
            <Button
              title="Хочу"
              onPress={handleAddToWishlist}
              variant="outline"
              style={styles.actionButton}
            />
          </View>
        );
      })()}

      {/* ActionSheet для действий с пластинкой в коллекции */}
      <ActionSheet
        visible={showActionSheet}
        actions={getActionSheetActions()}
        onClose={() => setShowActionSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  errorText: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginVertical: Spacing.lg,
  },
  content: {
    padding: Spacing.md,
  },
  coverContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cover: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: BorderRadius.lg,
  },
  coverPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoSection: {
    marginBottom: Spacing.lg,
  },
  artist: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  title: {
    ...Typography.h1,
    color: Colors.primary,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  card: {
    marginBottom: Spacing.md,
  },
  cardTitle: {
    ...Typography.h4,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  detailValue: {
    ...Typography.bodySmall,
    color: Colors.text,
    fontWeight: '500',
  },
  genreText: {
    ...Typography.body,
    color: Colors.text,
  },
  styleText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  priceItem: {
    alignItems: 'center',
  },
  priceLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  priceValue: {
    ...Typography.h4,
    color: Colors.text,
  },
  priceMedian: {
    color: Colors.accent,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  trackPosition: {
    ...Typography.caption,
    color: Colors.textMuted,
    width: 30,
  },
  trackTitle: {
    ...Typography.body,
    color: Colors.text,
    flex: 1,
  },
  trackDuration: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  addedButtonContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  addedButton: {
    flex: 1,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  addedButtonText: {
    ...Typography.button,
    color: Colors.textSecondary,
  },
  moreButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  removeButton: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  removeButtonText: {
    ...Typography.button,
    color: Colors.text,
  },
});
