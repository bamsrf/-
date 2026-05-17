/**
 * «Новое сообщение» — поиск пользователя для начала диалога.
 *
 * Re-используем существующий /users/search и openOrCreate из messages store.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '@/components/ui';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { api, resolveMediaUrl } from '../../lib/api';
import { useMessagesStore } from '../../lib/messagesStore';
import { UserWithStats } from '../../lib/types';
import { toast } from '../../lib/toast';

const DEBOUNCE_MS = 300;

export default function NewMessageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserWithStats[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const openOrCreate = useMessagesStore((s) => s.openOrCreate);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.searchUsers(query.trim());
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handlePick = useCallback(
    async (user: UserWithStats) => {
      if (isCreating) return;
      setIsCreating(true);
      try {
        const conv = await openOrCreate(user.id);
        // Закрываем модалку «Новое сообщение» и открываем тред поверх инбокса
        router.back();
        setTimeout(() => router.push(`/messages/${conv.id}` as any), 50);
      } catch (error: any) {
        toast.error(
          'Не удалось открыть диалог',
          error?.response?.data?.detail || 'Попробуйте позже'
        );
      } finally {
        setIsCreating(false);
      }
    },
    [isCreating, openOrCreate, router]
  );

  const renderItem = useCallback(
    ({ item }: { item: UserWithStats }) => (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.row}
        onPress={() => handlePick(item)}
      >
        <View style={styles.avatar}>
          {item.avatar_url ? (
            <Image
              source={resolveMediaUrl(item.avatar_url)}
              style={{ width: 44, height: 44, borderRadius: 22 }}
              cachePolicy="disk"
            />
          ) : (
            <Text style={styles.avatarTxt}>
              {item.username.slice(0, 2).toLowerCase()}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.rowName} numberOfLines={1}>
            @{item.username}
          </Text>
          {item.display_name ? (
            <Text style={styles.rowSub} numberOfLines={1}>
              {item.display_name}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>
    ),
    [handlePick]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="chevron-left" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Новое сообщение</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrap}>
        <Icon name="magnifying-glass" size={18} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Кому"
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={Colors.royalBlue}
          style={{ marginTop: Spacing.lg }}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !query.trim() ? null : (
              <Text style={styles.empty}>Никого не нашли</Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.text },

  list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarTxt: { fontSize: 12, fontWeight: '700', color: Colors.royalBlue, textTransform: 'uppercase' },
  rowName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  rowSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  empty: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.lg },
});
