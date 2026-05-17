/**
 * Root Layout - проверка авторизации и роутинг
 */
import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthStore, useOnboardingStore } from '../lib/store';
import { useMessagesStore } from '../lib/messagesStore';

// Sentry загружается только если пакет установлен (не в Expo Go)
type SentryStub = { init: (c: object) => void; wrap: <T>(c: T) => T };
let Sentry: SentryStub = { init: () => {}, wrap: (c) => c };
try {
  Sentry = require('@sentry/react-native');
} catch {
  // Expo Go — Sentry недоступен, используем заглушку
}
import { Colors } from '../constants/theme';
import { OfflineBanner } from '../components/OfflineBanner';
import { OnboardingOverlay } from '../components/OnboardingOverlay';
import { AchievementUnlockHost } from '../components/AchievementUnlockOverlay';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/CustomToast';
import { initAmplitude } from '../lib/analytics';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const sentryDsn = Constants.expoConfig?.extra?.sentryDsn as string | undefined;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.2,
    attachScreenshot: false,
  });
}

const amplitudeApiKey = Constants.expoConfig?.extra?.amplitudeApiKey as string | undefined;
if (amplitudeApiKey) {
  initAmplitude(amplitudeApiKey).catch(() => {
    // тихо — аналитика не должна ломать загрузку приложения
  });
}

SplashScreen.preventAutoHideAsync();

function RootLayout() {
  const { checkAuth, isLoading, isAuthenticated } = useAuthStore();
  const { checkOnboarding, isReady: onboardingReady } = useOnboardingStore();
  const router = useRouter();
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  // Запоминаем, был ли пользователь когда-либо авторизован за время сессии,
  // чтобы редирект на /(auth)/login срабатывал только при потере авторизации,
  // а не на холодном старте (когда isAuthenticated изначально false).
  const wasAuthenticatedRef = useRef(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    'RubikMonoOne-Regular': require('../assets/fonts/RubikMonoOne-Regular.ttf'),
  });

  useEffect(() => {
    checkAuth();
    checkOnboarding();
  }, []);

  useEffect(() => {
    // Foreground: уведомление пришло пока приложение открыто
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {
      // Обработка выполняется через setNotificationHandler выше
    });

    // Tap: пользователь нажал на уведомление
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      if (data?.recordId) {
        router.push(`/record/${data.recordId}`);
      } else if (data?.username) {
        router.push(`/user/${data.username}`);
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  // Фоновый polling unread-счётчика сообщений: при логине, при возврате в foreground,
  // каждые 20с пока приложение открыто. Заменится на WS-события в M2.
  useEffect(() => {
    if (!isAuthenticated) return;

    const refresh = () => useMessagesStore.getState().refreshUnread();
    refresh();

    let timer: ReturnType<typeof setInterval> | null = setInterval(refresh, 20_000);
    let appState: AppStateStatus = AppState.currentState;

    const sub = AppState.addEventListener('change', (next) => {
      if (appState.match(/inactive|background/) && next === 'active') {
        refresh();
        if (!timer) timer = setInterval(refresh, 20_000);
      } else if (next.match(/inactive|background/)) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }
      appState = next;
    });

    return () => {
      if (timer) clearInterval(timer);
      sub.remove();
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (fontsLoaded && !isLoading && onboardingReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, isLoading, onboardingReady]);

  // Глобальный auth-watchdog: если пользователь был залогинен и потерял сессию
  // (refresh-токен невалиден) — уводим на login независимо от текущего экрана.
  useEffect(() => {
    if (isAuthenticated) {
      wasAuthenticatedRef.current = true;
      return;
    }
    if (wasAuthenticatedRef.current && !isLoading) {
      wasAuthenticatedRef.current = false;
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (!fontsLoaded || isLoading || !onboardingReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OfflineBanner />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
            animation: 'slide_from_right',
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="profile"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen name="record/[id]" />
          <Stack.Screen name="folder/[id]" />
          <Stack.Screen name="wishlist-folder/[id]" />
          <Stack.Screen name="settings/edit-profile" />
          <Stack.Screen name="settings/share-profile" />
          <Stack.Screen name="user/[username]/index" />
          <Stack.Screen
            name="social/follow-requests"
            options={{ headerShown: true, title: 'Запросы на подписку' }}
          />
          <Stack.Screen name="collection/value" />
          <Stack.Screen name="settings/notifications" />
          <Stack.Screen name="settings/wishlists" />
          <Stack.Screen name="gift/[id]" />
          <Stack.Screen name="social/list" />
          <Stack.Screen name="dev/icons" />
          <Stack.Screen name="achievements" options={{ headerShown: true, title: 'Ачивки' }} />
          <Stack.Screen name="user/[username]/achievements" options={{ headerShown: true, title: 'Ачивки' }} />
          <Stack.Screen name="messages/index" />
          <Stack.Screen name="messages/[conversationId]" />
          <Stack.Screen name="messages/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        </Stack>
        <OnboardingOverlay />
        <AchievementUnlockHost />
        <Toast config={toastConfig} topOffset={56} bottomOffset={100} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
