/**
 * Карточка в стиле Nike
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { Colors, BorderRadius, Shadows, Spacing } from '../../constants/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'elevated' | 'flat' | 'outlined';
  padding?: 'none' | 'small' | 'default' | 'large';
  style?: ViewStyle;
}

export function Card({
  children,
  onPress,
  variant = 'elevated',
  padding = 'default',
  style,
}: CardProps) {
  const cardStyles = [
    styles.base,
    styles[variant],
    styles[`padding_${padding}`],
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.9}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },

  // Варианты
  elevated: {
    backgroundColor: Colors.background,
    ...Shadows.md,
  },
  flat: {
    backgroundColor: Colors.surface,
  },
  outlined: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Отступы
  padding_none: {
    padding: 0,
  },
  padding_small: {
    padding: Spacing.sm,
  },
  padding_default: {
    padding: Spacing.md,
  },
  padding_large: {
    padding: Spacing.lg,
  },
});

export default Card;
