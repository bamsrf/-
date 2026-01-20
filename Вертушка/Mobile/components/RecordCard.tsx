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
  onRemove?: () => void;
  showActions?: boolean;
  size?: 'default' | 'large';
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export function RecordCard({
  record,
  onPress,
  onAddToCollection,
  onAddToWishlist,
  onRemove,
  showActions = false,
  size = 'default',
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
}: RecordCardProps) {
  const imageUrl = record.cover_image_url || record.thumb_image_url;
  const cardWidth = size === 'large' ? width - Spacing.md * 2 : CARD_WIDTH;
  const imageHeight = size === 'large' ? cardWidth * 0.8 : CARD_WIDTH;

  const handlePress = () => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection();
    } else if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { width: cardWidth },
        Shadows.md,
        isSelectionMode && isSelected && styles.containerSelected,
      ]}
      onPress={handlePress}
      activeOpacity={0.9}
      disabled={isSelectionMode ? !onToggleSelection : !onPress}
    >
      {/* Чекбокс в режиме выбора */}
      {isSelectionMode && (
        <View style={styles.checkboxContainer}>
          <View
            style={[
              styles.checkbox,
              isSelected && styles.checkboxSelected,
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={16} color={Colors.background} />
            )}
          </View>
        </View>
      )}

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
        {isSelectionMode && isSelected && (
          <View style={styles.selectedOverlay} />
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
          {onRemove && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onRemove}
            >
              <Ionicons name="trash-outline" size={24} color={Colors.error} />
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
    position: 'relative',
  },
  containerSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  checkboxContainer: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    zIndex: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.3)',
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
