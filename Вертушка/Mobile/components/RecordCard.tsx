/**
 * Карточка пластинки
 */
import React from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, BorderRadius, Shadows, Spacing } from '../constants/theme';
import { RecordSearchResult, VinylRecord } from '../lib/types';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - Spacing.md * 3) / 2;

interface RecordCardProps {
  record: RecordSearchResult | VinylRecord;
  onPress?: () => void;
  onAddToCollection?: () => void;
  onAddToWishlist?: () => void;
  showActions?: boolean;
  size?: 'default' | 'large';
}

export function RecordCard({
  record,
  onPress,
  onAddToCollection,
  onAddToWishlist,
  showActions = false,
  size = 'default',
}: RecordCardProps) {
  const imageUrl = record.cover_image_url || record.thumb_image_url;
  const cardWidth = size === 'large' ? width - Spacing.md * 2 : CARD_WIDTH;
  const imageHeight = size === 'large' ? cardWidth * 0.8 : CARD_WIDTH;

  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }, Shadows.md]}
      onPress={onPress}
      activeOpacity={0.9}
      disabled={!onPress}
    >
      {/* Обложка */}
      <View style={[styles.imageContainer, { height: imageHeight }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="disc-outline" size={48} color={Colors.textMuted} />
          </View>
        )}
      </View>

      {/* Информация */}
      <View style={styles.info}>
        <Text style={styles.artist} numberOfLines={1}>
          {record.artist}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {record.title}
        </Text>
        
        <View style={styles.meta}>
          {record.year && (
            <Text style={styles.metaText}>{record.year}</Text>
          )}
          {record.format_type && (
            <>
              {record.year && <Text style={styles.metaDot}>•</Text>}
              <Text style={styles.metaText}>{record.format_type}</Text>
            </>
          )}
        </View>
      </View>

      {/* Кнопки действий */}
      {showActions && (
        <View style={styles.actions}>
          {onAddToCollection && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onAddToCollection}
            >
              <Ionicons name="add-circle-outline" size={24} color={Colors.primary} />
            </TouchableOpacity>
          )}
          {onAddToWishlist && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onAddToWishlist}
            >
              <Ionicons name="heart-outline" size={24} color={Colors.accent} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  imageContainer: {
    width: '100%',
    backgroundColor: Colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  info: {
    padding: Spacing.sm,
  },
  artist: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  title: {
    ...Typography.bodySmall,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  metaDot: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginHorizontal: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.sm,
    paddingTop: 0,
    gap: Spacing.sm,
  },
  actionButton: {
    padding: Spacing.xs,
  },
});

export default RecordCard;
