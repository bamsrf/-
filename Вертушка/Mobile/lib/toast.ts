/**
 * Утилита для показа тостов через react-native-toast-message.
 * Используй вместо Alert.alert для success/error/info сообщений.
 * Alert.alert оставляй только для подтверждений деструктивных действий.
 */
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

const haptic = (style: Haptics.NotificationFeedbackType) => {
  Haptics.notificationAsync(style).catch(() => {});
};

type ToastPosition = 'top' | 'bottom';

interface ToastOptions {
  position?: ToastPosition;
}

export const toast = {
  success: (message: string, subtitle?: string, options?: ToastOptions) => {
    haptic(Haptics.NotificationFeedbackType.Success);
    Toast.show({ type: 'success', text1: message, text2: subtitle, visibilityTime: 2500, position: options?.position ?? 'top' });
  },

  error: (message: string, subtitle?: string, options?: ToastOptions) => {
    haptic(Haptics.NotificationFeedbackType.Error);
    Toast.show({ type: 'error', text1: message, text2: subtitle, visibilityTime: 3000, position: options?.position ?? 'top' });
  },

  info: (message: string, subtitle?: string, options?: ToastOptions) =>
    Toast.show({ type: 'info', text1: message, text2: subtitle, visibilityTime: 2500, position: options?.position ?? 'top' }),
};
