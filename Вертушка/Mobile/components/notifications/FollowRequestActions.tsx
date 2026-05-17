/**
 * Inline-кнопки «Принять» / «Отклонить» для follow_request item.
 */
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, BorderRadius } from '@/constants/theme';

interface Props {
  onAccept: () => Promise<void> | void;
  onReject: () => Promise<void> | void;
}

export const FollowRequestActions: React.FC<Props> = ({ onAccept, onReject }) => {
  const [loading, setLoading] = useState<'accept' | 'reject' | null>(null);

  const handleAccept = async () => {
    if (loading) return;
    setLoading('accept');
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await onAccept();
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (loading) return;
    setLoading('reject');
    try {
      Haptics.selectionAsync().catch(() => {});
      await onReject();
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, styles.primary, loading && styles.disabled]}
        onPress={handleAccept}
        disabled={loading !== null}
        activeOpacity={0.85}
      >
        {loading === 'accept' ? (
          <ActivityIndicator size="small" color={Colors.background} />
        ) : (
          <Text style={styles.primaryText}>Принять</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.btn, styles.ghost, loading && styles.disabled]}
        onPress={handleReject}
        disabled={loading !== null}
        activeOpacity={0.7}
      >
        {loading === 'reject' ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : (
          <Text style={styles.ghostText}>Отклонить</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  btn: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: Colors.royalBlue,
  },
  primaryText: {
    ...Typography.buttonSmall,
    color: Colors.background,
  },
  ghost: {
    backgroundColor: Colors.surface,
  },
  ghostText: {
    ...Typography.buttonSmall,
    color: Colors.text,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default FollowRequestActions;
