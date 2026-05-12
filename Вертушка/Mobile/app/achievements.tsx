/**
 * Экран «Ачивки» — детальный грид по сериям + блок рандомных «Сюрпризы».
 *
 * Открывается:
 * - С виджета AchievementsBlock в `app/profile.tsx` → свои.
 * - С виджета в `user/[username]/index.tsx` → через `/user/[username]/achievements`
 *   (см. соседний роут с параметром username).
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { AchievementPin } from '../components/AchievementPin';
import type {
  AchievementItem,
  AchievementSeriesItem,
  MyAchievementsResponse,
} from '../lib/types';

export default function AchievementsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ username?: string }>();
  const username = params.username || null;

  const [data, setData] = useState<MyAchievementsResponse | null>(null);
  const [randomItems, setRandomItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<AchievementItem | null>(null);

  const load = useCallback(async () => {
    try {
      const resp = username
        ? await api.getAchievementsByUsername(username)
        : await api.getMyAchievements();
      setData(resp);
      if (!username) {
        const random = await api.getMyRandomUnlocked();
        setRandomItems(random.items);
      }
    } catch (e) {
      // оставляем data null — UI покажет пустое состояние
    }
  }, [username]);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Ачивки' }} />
        <View style={[styles.center, { paddingTop: insets.top + 60 }]}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <Stack.Screen options={{ title: 'Ачивки' }} />
        <View style={[styles.center, { paddingTop: insets.top + 60 }]}>
          <Text style={styles.errorText}>Не удалось загрузить ачивки.</Text>
        </View>
      </>
    );
  }

  const titleText = username ? `Ачивки @${username}` : 'Ачивки';

  return (
    <>
      <Stack.Screen options={{ title: titleText }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Сводка */}
        <View style={styles.summary}>
          <Text style={styles.summaryHeader}>{titleText}</Text>
          <Text style={styles.summaryCount}>
            открыто {data.unlocked} из {data.total}
          </Text>
          {data.random_unlocked > 0 && (
            <Text style={styles.summaryRandom}>
              ❓ Сюрпризы: {data.random_unlocked}
            </Text>
          )}
        </View>

        {/* Серии */}
        {data.series.map((series) => (
          <SeriesGroup
            key={series.key}
            series={series}
            onPin={(item) => setSelected(item)}
          />
        ))}

        {/* Блок рандомных — только на своём профиле */}
        {!username && (
          <SurpriseBlock
            randomCount={data.random_unlocked}
            randomItems={randomItems}
            onPin={(item) => setSelected(item)}
          />
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bottom-sheet с деталями */}
      {selected && <DetailsSheet item={selected} username={username} onClose={() => setSelected(null)} />}
    </>
  );
}

// ─── Серия ──────────────────────────────────────────────────────────────────

function SeriesGroup({
  series,
  onPin,
}: {
  series: AchievementSeriesItem;
  onPin: (item: AchievementItem) => void;
}) {
  // Мета — отдельно справа, остальные сетка
  const regulars = series.items.filter((i) => !i.is_meta);
  const meta = series.items.find((i) => i.is_meta) || null;

  return (
    <View style={styles.seriesCard}>
      <View style={styles.seriesHeader}>
        <Text style={styles.seriesTitle}>
          {series.icon_emoji} {series.title_ru}
        </Text>
        <Text style={styles.seriesCount}>
          {series.unlocked} / {series.total}
        </Text>
      </View>
      <Text style={styles.seriesDescription}>{series.description_ru}</Text>

      <View style={styles.gridWrap}>
        {regulars.map((it) => (
          <TouchableOpacity
            key={it.code}
            style={styles.gridCell}
            onPress={() => onPin(it)}
            activeOpacity={0.7}
          >
            <AchievementPin item={it} size={72} />
            <Text numberOfLines={1} style={styles.gridLabel}>
              {it.title_ru || '?'}
            </Text>
            {it.progress_target > 0 && !it.is_unlocked && (
              <Text style={styles.gridProgress}>
                {it.progress}/{it.progress_target}
              </Text>
            )}
          </TouchableOpacity>
        ))}

        {meta && (
          <TouchableOpacity
            style={[styles.gridCell, styles.gridCellMeta]}
            onPress={() => onPin(meta)}
            activeOpacity={0.7}
          >
            <AchievementPin item={meta} size={96} />
            <Text numberOfLines={1} style={[styles.gridLabel, styles.gridLabelMeta]}>
              {meta.title_ru || '?'}
            </Text>
            {meta.progress_target > 0 && !meta.is_unlocked && (
              <Text style={styles.gridProgress}>
                {meta.progress}/{meta.progress_target}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Сюрпризы ───────────────────────────────────────────────────────────────

function SurpriseBlock({
  randomCount,
  randomItems,
  onPin,
}: {
  randomCount: number;
  randomItems: AchievementItem[];
  onPin: (item: AchievementItem) => void;
}) {
  return (
    <View style={styles.seriesCard}>
      <View style={styles.seriesHeader}>
        <Text style={styles.seriesTitle}>❓ Сюрпризы</Text>
        <Text style={styles.seriesCount}>открыто {randomCount}</Text>
      </View>
      <Text style={styles.seriesDescription}>
        Их обычно находят сами. Не подсматривай.
      </Text>

      {randomItems.length === 0 ? (
        <View style={styles.surpriseEmpty}>
          <Text style={styles.surpriseEmptyText}>
            Пока ничего не нашлось.
          </Text>
        </View>
      ) : (
        <View style={styles.gridWrap}>
          {randomItems.map((it) => (
            <TouchableOpacity
              key={it.code}
              style={styles.gridCell}
              onPress={() => onPin(it)}
              activeOpacity={0.7}
            >
              <AchievementPin item={it} size={72} />
              <Text numberOfLines={1} style={styles.gridLabel}>
                {it.title_ru || '?'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Деталь ────────────────────────────────────────────────────────────────

function DetailsSheet({
  item,
  username,
  onClose,
}: {
  item: AchievementItem;
  username: string | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.sheetBackdrop} pointerEvents="box-none">
      <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetTopRow}>
          <AchievementPin item={item} size={140} />
        </View>
        <Text style={styles.sheetTitle}>
          {item.title_ru || '❓ Сюрприз'}
        </Text>
        <View style={styles.sheetTierRow}>
          <View
            style={[
              styles.tierChip,
              { backgroundColor: item.tier.color_hex + '22', borderColor: item.tier.color_hex },
            ]}
          >
            <Text style={[styles.tierChipText, { color: item.tier.color_hex }]}>
              {item.tier.label_ru}
            </Text>
          </View>
          {item.is_meta && (
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>★ Мета</Text>
            </View>
          )}
        </View>
        {item.description_ru && (
          <Text style={styles.sheetDescription}>{item.description_ru}</Text>
        )}
        {item.flavor_ru && !item.is_hidden && item.is_unlocked && (
          <Text style={styles.sheetFlavor}>«{item.flavor_ru}»</Text>
        )}
        {item.progress_target > 0 && !item.is_unlocked && (
          <View style={styles.sheetProgressRow}>
            <Text style={styles.sheetProgressText}>
              Прогресс: {item.progress} / {item.progress_target}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, (item.progress / Math.max(item.progress_target, 1)) * 100)}%`,
                    backgroundColor: item.tier.color_hex,
                  },
                ]}
              />
            </View>
          </View>
        )}
        {item.is_unlocked && item.unlocked_at && (
          <Text style={styles.sheetDate}>Открыто {formatDate(item.unlocked_at)}</Text>
        )}
        <TouchableOpacity style={styles.sheetCloseBtn} onPress={onClose}>
          <Ionicons name="close" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  summary: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  summaryHeader: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  summaryCount: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  summaryRandom: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textMuted,
  },
  seriesCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  seriesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  seriesTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  seriesCount: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  seriesDescription: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    rowGap: 18,
  },
  gridCell: {
    width: 88,
    alignItems: 'center',
  },
  gridCellMeta: {
    width: 100,
  },
  gridLabel: {
    marginTop: 8,
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
  },
  gridLabelMeta: {
    fontWeight: '700',
  },
  gridProgress: {
    marginTop: 2,
    fontSize: 11,
    color: Colors.textMuted,
  },
  surpriseEmpty: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  surpriseEmptyText: {
    color: Colors.textMuted,
    fontSize: 13,
  },
  sheetBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 11, 59, 0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 360,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
  },
  sheetTopRow: {
    alignItems: 'center',
    marginVertical: Spacing.sm,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  sheetTierRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: Spacing.sm,
  },
  tierChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  tierChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  metaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FFD66B',
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A4E00',
  },
  sheetDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: Spacing.sm,
  },
  sheetFlavor: {
    fontSize: 13,
    fontStyle: 'italic',
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: Spacing.md,
  },
  sheetProgressRow: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  sheetProgressText: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  sheetDate: {
    marginTop: Spacing.md,
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  sheetCloseBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
