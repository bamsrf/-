/**
 * Tab Navigation - Поиск, Скан, Коллекция
 */
import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../lib/store';
import { Colors, ComponentSizes, Typography } from '../../constants/theme';

export default function TabLayout() {
  const { isAuthenticated } = useAuthStore();
  const insets = useSafeAreaInsets();

  // Если не авторизован - редирект на логин
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: ComponentSizes.tabBarHeight,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
          paddingTop: 8,
          backgroundColor: Colors.background,
          borderTopWidth: 1,
          borderTopColor: Colors.divider,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: {
          ...Typography.caption,
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="search"
        options={{
          title: 'Поиск',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Скан',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.scanButton, focused && styles.scanButtonActive]}>
              <Ionicons
                name="scan-outline"
                size={28}
                color={focused ? Colors.background : color}
              />
            </View>
          ),
          tabBarLabelStyle: {
            display: 'none',
          },
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: 'Коллекция',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="disc-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  scanButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  scanButtonActive: {
    backgroundColor: Colors.primary,
  },
});
