/**
 * Сегментированный контрол (Моё / Хочу)
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, BorderRadius, Spacing } from '../../constants/theme';

interface SegmentedControlProps<T extends string> {
  segments: { key: T; label: string }[];
  selectedKey: T;
  onSelect: (key: T) => void;
  style?: ViewStyle;
}

export function SegmentedControl<T extends string>({
  segments,
  selectedKey,
  onSelect,
  style,
}: SegmentedControlProps<T>) {
  const selectedIndex = segments.findIndex((s) => s.key === selectedKey);
  const translateX = useSharedValue(0);

  React.useEffect(() => {
    translateX.value = withTiming(selectedIndex * (100 / segments.length), {
      duration: 200,
    });
  }, [selectedIndex, segments.length]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${translateX.value}%` }],
    width: `${100 / segments.length}%`,
  }));

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      
      {segments.map((segment) => {
        const isSelected = segment.key === selectedKey;
        
        return (
          <TouchableOpacity
            key={segment.key}
            style={styles.segment}
            onPress={() => onSelect(segment.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextSelected,
              ]}
            >
              {segment.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  segmentText: {
    ...Typography.buttonSmall,
    color: Colors.textSecondary,
  },
  segmentTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default SegmentedControl;
