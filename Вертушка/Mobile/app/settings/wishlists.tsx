/**
 * Вишлисты: «Я дарю» / «Мне дарят» — список бронирований с управлением статусами
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ActionSheetIOS,
  Platform,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useCollectionStore } from '../../lib/store';
import { GiftGivenItem, GiftReceivedItem } from '../../lib/types';
import { SegmentedControl } from '../../components/ui';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';

type Tab = 'given' | 'received';

const SEGMENTS: { key: Tab; label: string }[] = [
  { key: 'given', label: 'Я дарю' },
  { key: 'received', label: 'Мне дарят' },
];

type GiftStatus = 'pending' | 'booked' | 'completed' | 'cancelled';

const STATUS_LABEL: Record<GiftStatus, string> = {
  pending: 'Ждёт подтверждения',
  booked: 'Забронировано',
  completed: 'Доставлено',
  cancelled: 'Отменено',
};

const STATUS_COLOR: Record<GiftStatus, string> = {
  pending: Colors.warning,
  booked: Colors.royalBlue,
  completed: Colors.success,
  cancelled: Colors.textMuted,
};

function StatusPill({ status }: { status: GiftStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <View style={[styles.statusPill, { backgroundColor: color + '15' }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}

function GiftRow({
  cover,
  title,
  subtitle,
  status,
  onPress,
}: {
  cover?: string;
  title: string;
  subtitle: string;
  status: GiftStatus;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      {cover ? (
        <Image
          source={cover}
          style={styles.cover}
          contentFit="cover"
          cachePolicy="disk"
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Ionicons name="disc-outline" size={24} color={Colors.textMuted} />
        </View>
      )}
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        <Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle}</Text>
        <StatusPill status={status} />
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

export default function WishlistsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { fetchCollectionItems, fetchWishlistItems } = useCollectionStore();

  const [activeTab, setActiveTab] = useState<Tab>(
    params.tab === 'received' ? 'received' : 'given',
  );
  const [givenGifts, setGivenGifts] = useState<GiftGivenItem[]>([]);
  const [receivedGifts, setReceivedGifts] = useState<GiftReceivedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [given, received] = await Promise.all([
        api.getMyGivenGifts(),
        api.getMyReceivedGifts(),
      ]);
      setGivenGifts(given);
      setReceivedGifts(received);
    } catch {
      toast.error('Не удалось загрузить подарки');
    }
  }, []);

  useEffect(() => {
    (async () => {
      await loadAll();
      setIsLoading(false);
    })();
  }, [loadAll]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }, [loadAll]);

  const showActions = useCallback(
    (title: string, options: { label: string; onPress?: () => void; destructive?: boolean }[]) => {
      const labels = [...options.map((o) => o.label), 'Отмена'];
      const cancelButtonIndex = labels.length - 1;
      const destructiveButtonIndex = options.findIndex((o) => o.destructive);

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            title,
            options: labels,
            cancelButtonIndex,
            destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
          },
          (idx) => {
            if (idx < options.length) options[idx].onPress?.();
          },
        );
      } else {
        Alert.alert(title, undefined, [
          ...options.map((o) => ({
            text: o.label,
            style: o.destructive ? ('destructive' as const) : undefined,
            onPress: o.onPress,
          })),
          { text: 'Отмена', style: 'cancel' as const },
        ]);
      }
    },
    [],
  );

  const handleGivenPress = useCallback((gift: GiftGivenItem) => {
    const options: { label: string; onPress?: () => void; destructive?: boolean }[] = [
      {
        label: 'Открыть пластинку',
        onPress: () => router.push(`/record/${gift.record.id}`),
      },
    ];

    if (gift.status === 'booked') {
      options.push({
        label: 'Отменить бронь',
        destructive: true,
        onPress: () => {
          Alert.alert(
            'Отменить бронирование?',
            `${gift.record.artist} — ${gift.record.title}`,
            [
              { text: 'Нет', style: 'cancel' },
              {
                text: 'Отменить',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await api.cancelGiftBooking(gift.id, gift.cancel_token);
                    setGivenGifts((prev) => prev.filter((g) => g.id !== gift.id));
                    toast.success('Бронь отменена');
                  } catch {
                    toast.error('Не удалось отменить бронирование');
                  }
                },
              },
            ],
          );
        },
      });
    }

    showActions(`${gift.record.artist} — ${gift.record.title}`, options);
  }, [router, showActions]);

  const handleReceivedPress = useCallback((gift: GiftReceivedItem) => {
    const options: { label: string; onPress?: () => void; destructive?: boolean }[] = [
      {
        label: 'Открыть пластинку',
        onPress: () => router.push(`/record/${gift.record.id}`),
      },
    ];

    if (gift.status === 'booked') {
      options.unshift({
        label: 'Подарок получен',
        onPress: () => {
          Alert.alert(
            'Подарок получен?',
            `${gift.record.artist} — ${gift.record.title}\n\nПластинка добавится в твою коллекцию, дарителю придёт «спасибо».`,
            [
              { text: 'Ещё нет', style: 'cancel' },
              {
                text: 'Получено!',
                onPress: async () => {
                  try {
                    await api.completeGiftBooking(gift.id);
                    setReceivedGifts((prev) => prev.filter((g) => g.id !== gift.id));
                    await Promise.all([fetchCollectionItems(), fetchWishlistItems()]);
                    toast.success('Спасибо!', 'Пластинка теперь в твоей коллекции');
                  } catch (error: any) {
                    toast.error('Ошибка', error?.response?.data?.detail || 'Не удалось отметить подарок');
                  }
                },
              },
            ],
          );
        },
      });
    }

    showActions(`${gift.record.artist} — ${gift.record.title}`, options);
  }, [router, showActions, fetchCollectionItems, fetchWishlistItems]);

  const renderGiven = ({ item }: { item: GiftGivenItem }) => (
    <GiftRow
      cover={item.record.cover_image_url}
      title={item.record.title}
      subtitle={`${item.record.artist} · для @${item.for_user.username}`}
      status={item.status as GiftStatus}
      onPress={() => handleGivenPress(item)}
    />
  );

  const renderReceived = ({ item }: { item: GiftReceivedItem }) => (
    <GiftRow
      cover={item.record.cover_image_url}
      title={item.record.title}
      subtitle={item.record.artist}
      status={item.status}
      onPress={() => handleReceivedPress(item)}
    />
  );

  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconWrap}>
          <Ionicons
            name={activeTab === 'given' ? 'gift-outline' : 'mail-open-outline'}
            size={36}
            color={Colors.royalBlue}
          />
        </View>
        <Text style={styles.emptyTitle}>
          {activeTab === 'given' ? 'Ты пока никого не дарил' : 'Ничего не забронировано'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {activeTab === 'given'
            ? 'Открой вишлист друга по ссылке и забронируй пластинку — он не узнает, кто даритель'
            : 'Поделись своей публичной ссылкой на вишлист — друзья смогут забронировать пластинку в подарок'}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.royalBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Вишлисты</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.segmentWrap}>
        <SegmentedControl
          segments={SEGMENTS}
          selectedKey={activeTab}
          onSelect={setActiveTab}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.royalBlue} />
        </View>
      ) : activeTab === 'given' ? (
        <FlatList
          data={givenGifts}
          keyExtractor={(item) => item.id}
          renderItem={renderGiven}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            givenGifts.length === 0 && styles.listContentEmpty,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.royalBlue} />
          }
        />
      ) : (
        <FlatList
          data={receivedGifts}
          keyExtractor={(item) => item.id}
          renderItem={renderReceived}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            receivedGifts.length === 0 && styles.listContentEmpty,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.royalBlue} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
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
  segmentWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  rowSubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: BorderRadius.sm,
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...Typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxl,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.royalBlue + '12',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    ...Typography.h4,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
