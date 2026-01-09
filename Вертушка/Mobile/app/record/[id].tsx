/**
 * Экран детальной информации о пластинке
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '../../components/Header';
import { Button, Card } from '../../components/ui';
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

  const { addToCollection, addToWishlist } = useCollectionStore();

  useEffect(() => {
    loadRecord();
  }, [id]);

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

    try {
      await addToCollection(record.discogs_id || record.id);
      Alert.alert('Готово!', 'Пластинка добавлена в коллекцию');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить в коллекцию');
    }
  };

  const handleAddToWishlist = async () => {
    if (!record) return;

    try {
      await addToWishlist(record.discogs_id || record.id);
      Alert.alert('Готово!', 'Пластинка добавлена в список желаний');
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось добавить в список желаний');
    }
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
            {record.year && (
              <View style={styles.metaItem}>
                <Ionicons name="calendar-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{record.year}</Text>
              </View>
            )}
            {record.format_type && (
              <View style={styles.metaItem}>
                <Ionicons name="disc-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{record.format_type}</Text>
              </View>
            )}
            {record.country && (
              <View style={styles.metaItem}>
                <Ionicons name="globe-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.metaText}>{record.country}</Text>
              </View>
            )}
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
});
