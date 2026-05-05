/**
 * Настройки вишлиста: публичность, видимость дарителей, кастомное сообщение
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { Wishlist, WishlistSettingsUpdate } from '../../lib/types';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

const TRACK_W = 52;
const TRACK_H = 30;
const VINYL_SIZE = 26;
const TRACK_PAD = 2;
const SLIDE_DISTANCE = TRACK_W - VINYL_SIZE - TRACK_PAD * 2;
const CUSTOM_MESSAGE_MAX = 200;

function VinylToggle({ value, onValueChange, disabled }: {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  const anim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: value ? 1 : 0,
      useNativeDriver: true,
      friction: 7,
      tension: 40,
    }).start();
  }, [value]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SLIDE_DISTANCE],
  });

  const spin = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const trackBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.royalBlue],
  });

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      hitSlop={8}
    >
      <Animated.View style={[
        vinylStyles.track,
        { backgroundColor: trackBg },
        disabled && { opacity: 0.5 },
      ]}>
        <Animated.View style={[
          vinylStyles.vinyl,
          { transform: [{ translateX }, { rotate: spin }] },
        ]}>
          <View style={vinylStyles.groove1} />
          <View style={vinylStyles.groove2} />
          <View style={vinylStyles.label} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

const vinylStyles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    paddingHorizontal: TRACK_PAD,
    justifyContent: 'center',
  },
  vinyl: {
    width: VINYL_SIZE,
    height: VINYL_SIZE,
    borderRadius: VINYL_SIZE / 2,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groove1: {
    position: 'absolute',
    width: VINYL_SIZE - 4,
    height: VINYL_SIZE - 4,
    borderRadius: (VINYL_SIZE - 4) / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  groove2: {
    position: 'absolute',
    width: VINYL_SIZE - 10,
    height: VINYL_SIZE - 10,
    borderRadius: (VINYL_SIZE - 10) / 2,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  label: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.royalBlue,
  },
});

function SettingRow({ label, description, value, onToggle, disabled }: {
  label: string;
  description?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingLabel}>{label}</Text>
        {description && <Text style={styles.settingDescription}>{description}</Text>}
      </View>
      <VinylToggle
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
      />
    </View>
  );
}

export default function WishlistSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const data = await api.getWishlist();
      setWishlist(data);
      setCustomMessage(data.custom_message ?? '');
      setSavedMessage(data.custom_message ?? '');
    } catch {
      toast.error('Не удалось загрузить настройки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = useCallback(async (key: keyof WishlistSettingsUpdate, value: boolean) => {
    if (!wishlist) return;

    const prev = wishlist;
    setWishlist({ ...wishlist, [key]: value });
    setIsSaving(true);

    try {
      await api.updateWishlistSettings({ [key]: value });
    } catch {
      setWishlist(prev);
      toast.error('Не удалось сохранить настройку');
    } finally {
      setIsSaving(false);
    }
  }, [wishlist]);

  const handleSaveMessage = useCallback(async () => {
    setIsSaving(true);
    try {
      await api.updateWishlistSettings({ custom_message: customMessage });
      setSavedMessage(customMessage);
      toast.success('Сообщение сохранено');
    } catch {
      toast.error('Не удалось сохранить сообщение');
    } finally {
      setIsSaving(false);
    }
  }, [customMessage]);

  const messageDirty = customMessage !== savedMessage;
  const isPublic = wishlist?.is_public ?? false;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.royalBlue} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.royalBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Настройки вишлиста</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.sectionTitle}>Доступ</Text>
        <View style={styles.section}>
          <SettingRow
            label="Публичный вишлист"
            description="По ссылке открывается всем без логина"
            value={isPublic}
            onToggle={(val) => handleToggle('is_public', val)}
            disabled={isSaving}
          />
        </View>

        <Text style={styles.sectionTitle}>Подарки</Text>
        <View style={styles.section}>
          <SettingRow
            label="Имена дарителей публично"
            description="Гости видят, кто уже забронировал пластинку"
            value={wishlist?.show_gifter_names ?? false}
            onToggle={(val) => handleToggle('show_gifter_names', val)}
            disabled={isSaving}
          />
          <SettingRow
            label="Хочу знать имя сразу"
            description="Иначе имя дарителя я узнаю только когда отмечу подарок полученным"
            value={wishlist?.reveal_gifter_to_owner ?? false}
            onToggle={(val) => handleToggle('reveal_gifter_to_owner', val)}
            disabled={isSaving}
          />
        </View>

        <Text style={styles.sectionTitle}>Сообщение для гостей</Text>
        <Text style={styles.sectionDescription}>
          Видно на публичной странице вишлиста — например, повод или адрес
        </Text>
        <View style={styles.messageContainer}>
          <TextInput
            style={styles.messageInput}
            value={customMessage}
            onChangeText={setCustomMessage}
            placeholder="Привет! Вот пластинки, которые я давно ищу…"
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={CUSTOM_MESSAGE_MAX}
            textAlignVertical="top"
          />
          <Text style={styles.messageCounter}>
            {customMessage.length} / {CUSTOM_MESSAGE_MAX}
          </Text>
        </View>
        {messageDirty && (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSaveMessage}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Text style={styles.saveButtonText}>Сохранить сообщение</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: insets.bottom + Spacing.xl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitle: {
    ...Typography.h4,
    color: Colors.royalBlue,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 36,
    height: 36,
  },
  content: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.h4,
    color: Colors.royalBlue,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionDescription: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  settingInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  settingLabel: {
    ...Typography.body,
    color: Colors.text,
  },
  settingDescription: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  messageContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  messageInput: {
    ...Typography.body,
    color: Colors.text,
    minHeight: 96,
    padding: 0,
  },
  messageCounter: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'right',
  },
  saveButton: {
    backgroundColor: Colors.royalBlue,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.button,
    color: Colors.background,
  },
});
