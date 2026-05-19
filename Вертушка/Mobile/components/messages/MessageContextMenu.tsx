/**
 * Telegram-style контекст-меню для сообщения.
 *
 * Открывается по long-press на бабле. Показывает:
 *   • Emoji-реакции (Phase 3 — пока визуально, без бэка)
 *   • Превью-копию бабла (изолированный snapshot)
 *   • Вертикальный список действий (Ответить / Скопировать / Поделиться /
 *     Выделить / Удалить-если-своё)
 *
 * Модалка с blur-backdrop, spring-in анимацией. Тап вне зоны меню — закрывает.
 */
import React, { useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Pressable,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Icon } from '@/components/ui';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';

export type MenuAction = {
  key: string;
  label: string;
  icon: string;
  destructive?: boolean;
  onPress: () => void;
};

export const QUICK_REACTIONS = ['❤️', '🔥', '😂', '😮', '😢', '👍'] as const;

interface Props {
  visible: boolean;
  isMine: boolean;
  bubbleSnapshot: React.ReactNode;
  actions: MenuAction[];
  onClose: () => void;
  onReact?: (emoji: string) => void;
}

export function MessageContextMenu({
  visible,
  isMine,
  bubbleSnapshot,
  actions,
  onClose,
  onReact,
}: Props) {
  const scale = useSharedValue(0.94);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      scale.value = withSpring(1, { damping: 18, stiffness: 240 });
      opacity.value = withTiming(1, { duration: 160 });
    } else {
      scale.value = 0.94;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                isMine ? styles.cardMine : styles.cardOther,
                cardStyle,
              ]}
            >
              <View style={styles.reactionsRow}>
                {QUICK_REACTIONS.map((emoji) => (
                  <Pressable
                    key={emoji}
                    style={({ pressed }) => [
                      styles.reactionBtn,
                      pressed && styles.reactionBtnPressed,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      onReact?.(emoji);
                      onClose();
                    }}
                  >
                    <Text style={styles.reactionEmoji}>{emoji}</Text>
                  </Pressable>
                ))}
              </View>

              <View
                style={[
                  styles.bubbleSnapWrap,
                  isMine ? styles.bubbleSnapWrapMine : styles.bubbleSnapWrapOther,
                ]}
                pointerEvents="none"
              >
                {bubbleSnapshot}
              </View>

              <View
                style={[
                  styles.actions,
                  isMine ? styles.actionsMine : styles.actionsOther,
                ]}
              >
                {actions.map((a, i) => (
                  <TouchableOpacity
                    key={a.key}
                    activeOpacity={0.6}
                    style={[
                      styles.actionRow,
                      i < actions.length - 1 && styles.actionRowDivider,
                    ]}
                    onPress={() => {
                      a.onPress();
                      onClose();
                    }}
                  >
                    <Text
                      style={[
                        styles.actionLabel,
                        a.destructive && styles.actionLabelDestructive,
                      ]}
                    >
                      {a.label}
                    </Text>
                    <Icon
                      name={a.icon}
                      size={18}
                      color={a.destructive ? '#E5484D' : Colors.text}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    gap: Spacing.sm,
  },
  cardMine: { alignItems: 'flex-end' },
  cardOther: { alignItems: 'flex-start' },

  /* Reactions row */
  reactionsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  reactionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionBtnPressed: {
    backgroundColor: Colors.surface,
    transform: [{ scale: 1.15 }],
  },
  reactionEmoji: { fontSize: 22 },

  /* Snapshot of the bubble (read-only) */
  bubbleSnapWrap: {
    maxWidth: '90%',
  },
  bubbleSnapWrapMine: { alignSelf: 'flex-end' },
  bubbleSnapWrapOther: { alignSelf: 'flex-start' },

  /* Actions menu */
  actions: {
    minWidth: 220,
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  actionsMine: { alignSelf: 'flex-end' },
  actionsOther: { alignSelf: 'flex-start' },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  actionRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  actionLabel: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  actionLabelDestructive: { color: '#E5484D' },
});
