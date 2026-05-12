/**
 * Профиль другого пользователя — внутриприложный вид.
 *
 * Логика:
 * - Сверху шапка: аватар + @username + custom_title + bio + ачивки + стоимость коллекции
 * - Ниже — как личная вкладка коллекции: segmented «В наличии / Вишлист», формат-фильтры, grid/list
 * - Бронь подарка из вишлиста доступна только если ты подписан (is_following === true).
 * - В модалке брони имя/email берутся из учётки автоматически — спрашиваем только сообщение.
 */
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  Pressable,
  Dimensions,
  Share,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Icon } from '@/components/ui';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, resolveMediaUrl } from '../../../lib/api';
import { useAuthStore, useFollowStore } from '../../../lib/store';
import {
  PublicProfile,
  PublicProfileRecord,
  WishlistPublicItem,
  WishlistPublicResponse,
} from '../../../lib/types';
import { toast } from '../../../lib/toast';
import { AchievementsBlock } from '../../../components/AchievementsBlock';

type ProfileTab = 'collection' | 'wishlist';
type ViewMode = 'grid' | 'list';
type FormatFilter = 'all' | 'LP' | 'EP' | '7"';

const PP = {
  ivory: '#F4EEE6',
  ivorySoft: '#F0EBE2',
  ivoryDeep: '#ECE6DC',
  pearl: '#F7F4EE',
  cobalt: '#3A4BE0',
  cobaltBright: '#4E5BFF',
  periwinkle: '#9AA8FF',
  lavender: '#C9B8FF',
  blush: '#F6C7D0',
  sky: '#BDD4FF',
  ink: '#1B1D26',
  slate: '#6B7080',
  mute: '#9096A6',
  hairline: 'rgba(27,29,38,0.08)',
  whiteSoft: 'rgba(255,255,255,0.6)',
};

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 12;
const GRID_PADDING = 20;
const GRID_COLS = 3;
const CARD_W = Math.floor((SCREEN_W - GRID_PADDING * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS);

function formatRub(value: number) {
  return Math.round(value).toLocaleString('ru-RU').replace(/,/g, ' ');
}

function priceLabel(record: PublicProfileRecord): string | null {
  if (!record.estimated_price_median) return null;
  return `~$${Math.round(record.estimated_price_median)}`;
}

/* ---------------- SEGMENTED ---------------- */
function Segmented({
  value,
  onChange,
  items,
}: {
  value: ProfileTab;
  onChange: (v: ProfileTab) => void;
  items: { id: ProfileTab; label: string; count: number }[];
}) {
  const [widths, setWidths] = useState<number[]>([0, 0]);
  const [offsets, setOffsets] = useState<number[]>([0, 0]);
  const pillX = useRef(new Animated.Value(0)).current;
  const pillW = useRef(new Animated.Value(0)).current;
  const idx = items.findIndex((s) => s.id === value);

  useEffect(() => {
    if (widths[idx]) {
      Animated.parallel([
        Animated.timing(pillX, {
          toValue: offsets[idx],
          duration: 380,
          easing: Easing.bezier(0.22, 0.7, 0.18, 1),
          useNativeDriver: false,
        }),
        Animated.timing(pillW, {
          toValue: widths[idx],
          duration: 380,
          easing: Easing.bezier(0.22, 0.7, 0.18, 1),
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [idx, widths, offsets, pillX, pillW]);

  return (
    <View style={styles.segmented}>
      <Animated.View
        style={[
          styles.segmentedPill,
          { transform: [{ translateX: pillX }], width: pillW },
        ]}
      />
      {items.map((s, i) => {
        const active = s.id === value;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            onLayout={(e) => {
              const { width, x } = e.nativeEvent.layout;
              setWidths((w) => {
                const next = [...w];
                next[i] = width;
                return next;
              });
              setOffsets((o) => {
                const next = [...o];
                next[i] = x;
                return next;
              });
            }}
            style={styles.segmentedBtn}
          >
            <Text style={[styles.segmentedLabel, active && styles.segmentedLabelActive]}>
              {s.label}
            </Text>
            <View style={[styles.segmentedCount, active && styles.segmentedCountActive]}>
              <Text style={[styles.segmentedCountTxt, active && styles.segmentedCountTxtActive]}>
                {s.count}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------------- RESERVED BADGE ---------------- */
function ReservedBadge() {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1300, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1300, useNativeDriver: false }),
      ])
    ).start();
  }, [pulse]);
  const shadow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 6] });
  return (
    <Animated.View
      style={[
        styles.reservedBadge,
        {
          shadowColor: PP.periwinkle,
          shadowOpacity: 0.5,
          shadowRadius: shadow as any,
          shadowOffset: { width: 0, height: 0 },
        },
      ]}
    >
      <View style={styles.reservedDot} />
      <Text style={styles.reservedText}>Забронировано</Text>
    </Animated.View>
  );
}

/* ---------------- VIEW TOGGLE + FORMAT FILTER ---------------- */
function ViewToggle({ value, onChange }: { value: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <View style={styles.viewToggle}>
      {(['grid', 'list'] as ViewMode[]).map((m) => {
        const active = m === value;
        return (
          <TouchableOpacity
            key={m}
            onPress={() => onChange(m)}
            style={[styles.viewToggleBtn, active && styles.viewToggleBtnActive]}
          >
            <Icon
              name={m === 'grid' ? 'grid-outline' : 'list-outline'}
              size={15}
              color={active ? PP.cobalt : PP.mute}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FormatChips({
  value,
  onChange,
}: {
  value: FormatFilter;
  onChange: (v: FormatFilter) => void;
}) {
  const opts: { id: FormatFilter; label: string }[] = [
    { id: 'all', label: 'Все' },
    { id: 'LP', label: 'LP' },
    { id: 'EP', label: 'EP' },
    { id: '7"', label: '7"' },
  ];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 6 }}
    >
      {opts.map((o) => {
        const active = o.id === value;
        return (
          <TouchableOpacity
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.formatChip, active && styles.formatChipActive]}
          >
            <Text style={[styles.formatChipTxt, active && styles.formatChipTxtActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/* ---------------- CARDS ---------------- */
function RecordCardLight({
  record,
  reserved,
  onPress,
}: {
  record: PublicProfileRecord;
  reserved?: boolean;
  onPress?: () => void;
}) {
  const price = priceLabel(record);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={{ width: CARD_W }}>
      <View style={styles.cardCover}>
        {record.cover_image_url ? (
          <Image
            source={resolveMediaUrl(record.cover_image_url)}
            style={{ width: '100%', height: '100%' }}
            cachePolicy="disk"
          />
        ) : (
          <LinearGradient
            colors={[PP.lavender, PP.sky]}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </View>
      <View style={{ paddingTop: 8, paddingHorizontal: 1 }}>
        <Text numberOfLines={1} style={styles.cardArtist}>
          {record.artist}
        </Text>
        <Text numberOfLines={1} style={styles.cardTitle}>
          {record.title}
        </Text>
        {price ? <Text style={styles.cardPrice}>{price}</Text> : null}
        {(record.year || record.format_type) ? (
          <Text style={styles.cardInfo} numberOfLines={1}>
            {record.year || ''}
            {record.format_type ? ` · ${record.format_type}` : ''}
          </Text>
        ) : null}
        {reserved ? <View style={{ marginTop: 6 }}><ReservedBadge /></View> : null}
      </View>
    </TouchableOpacity>
  );
}

function RecordRowLight({
  record,
  reserved,
  onPress,
}: {
  record: PublicProfileRecord;
  reserved?: boolean;
  onPress?: () => void;
}) {
  const price = priceLabel(record);
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.row}>
      <View style={styles.rowCover}>
        {record.cover_image_url ? (
          <Image
            source={resolveMediaUrl(record.cover_image_url)}
            style={{ width: 64, height: 64 }}
            cachePolicy="disk"
          />
        ) : (
          <LinearGradient colors={[PP.lavender, PP.sky]} style={{ width: 64, height: 64 }} />
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={styles.cardArtist}>{record.artist}</Text>
        <Text numberOfLines={1} style={[styles.cardTitle, { fontSize: 14 }]}>{record.title}</Text>
        <Text style={styles.cardInfo} numberOfLines={1}>
          {record.year || ''}
          {record.format_type ? ` · ${record.format_type}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        {price ? <Text style={styles.cardPrice}>{price}</Text> : null}
        {reserved ? <ReservedBadge /> : null}
      </View>
    </TouchableOpacity>
  );
}

/* ---------------- SCREEN ---------------- */
export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuthStore();
  const { followUser, unfollowUser } = useFollowStore();

  const [pubProfile, setPubProfile] = useState<PublicProfile | null>(null);
  const [wishlist, setWishlist] = useState<WishlistPublicResponse | null>(null);
  const [following, setFollowing] = useState(false);
  const [, setFollowersCount] = useState(0);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<ProfileTab>('collection');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const [bookingItem, setBookingItem] = useState<WishlistPublicItem | null>(null);
  const [bookingMessage, setBookingMessage] = useState('');
  const [isBooking, setIsBooking] = useState(false);

  const counterAnim = useRef(new Animated.Value(0)).current;
  const [displayValue, setDisplayValue] = useState(0);

  const isOwn = currentUser?.username === username;

  const load = useCallback(async () => {
    if (!username) return;
    try {
      const [pub, userMeta] = await Promise.all([
        api.getPublicProfile(username),
        api.getUserByUsername(username).catch(() => null),
      ]);
      setPubProfile(pub);
      if (userMeta) {
        setProfileUserId(userMeta.id);
        setFollowing(userMeta.is_following);
        setFollowersCount(userMeta.followers_count);
      }
    } catch {
      toast.error('Профиль не найден');
      router.back();
    } finally {
      setIsLoading(false);
    }
  }, [username, router]);

  const loadWishlist = useCallback(async () => {
    if (!username) return;
    try {
      const data = await api.getUserWishlistByUsername(username);
      setWishlist(data);
    } catch {
      setWishlist(null);
    }
  }, [username]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (pubProfile && activeTab === 'wishlist' && !wishlist) loadWishlist();
  }, [pubProfile, activeTab, wishlist, loadWishlist]);

  useEffect(() => {
    if (!pubProfile?.collection_value_rub) return;
    counterAnim.setValue(0);
    const id = counterAnim.addListener(({ value }) => {
      setDisplayValue(Math.round(value * (pubProfile.collection_value_rub || 0)));
    });
    Animated.timing(counterAnim, {
      toValue: 1,
      duration: 1400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => counterAnim.removeListener(id);
  }, [pubProfile?.collection_value_rub, counterAnim]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await load();
    if (activeTab === 'wishlist') await loadWishlist();
    setIsRefreshing(false);
  }, [load, loadWishlist, activeTab]);

  const handleFollow = useCallback(async () => {
    if (!profileUserId) return;
    setIsFollowLoading(true);
    try {
      if (following) {
        await unfollowUser(profileUserId);
        setFollowing(false);
        setFollowersCount((c) => Math.max(0, c - 1));
      } else {
        await followUser(profileUserId);
        setFollowing(true);
        setFollowersCount((c) => c + 1);
      }
    } catch (error: any) {
      toast.error('Ошибка', error?.response?.data?.detail || 'Не удалось');
    } finally {
      setIsFollowLoading(false);
    }
  }, [profileUserId, following, followUser, unfollowUser]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({ message: `https://vinyl-vertushka.ru/@${username}` });
    } catch {}
  }, [username]);

  const tryOpenBooking = useCallback(
    (item: WishlistPublicItem | null, reserved: boolean) => {
      if (!item || reserved || isOwn) return;
      if (!currentUser) {
        router.push('/(auth)/register');
        return;
      }
      if (!following) {
        toast.info('Подпишитесь', 'Бронь подарков доступна подписчикам');
        return;
      }
      setBookingItem(item);
    },
    [currentUser, following, isOwn, router]
  );

  const isBookingRef = useRef(false);
  const handleBookGift = useCallback(async () => {
    if (!bookingItem || !currentUser) return;
    if (isBookingRef.current) return;
    isBookingRef.current = true;
    setIsBooking(true);
    try {
      const gifterName = (currentUser.display_name?.trim() || currentUser.username || '').trim();
      const gifterEmail = (currentUser.email || '').trim();
      if (!gifterName || !gifterEmail) {
        toast.error('Не удалось забронировать', 'Заполните имя и email в своём профиле');
        return;
      }
      await api.bookGift({
        wishlist_item_id: bookingItem.id,
        gifter_name: gifterName,
        gifter_email: gifterEmail,
        gifter_message: bookingMessage.trim() || undefined,
      });
      toast.success('Готово!', 'Бронь на 60 дней. Подтверждение отправлено на email.');
      setBookingItem(null);
      setBookingMessage('');
      await loadWishlist();
    } catch (error: any) {
      toast.error('Ошибка', error?.response?.data?.detail || 'Не удалось забронировать');
    } finally {
      setIsBooking(false);
      isBookingRef.current = false;
    }
  }, [bookingItem, bookingMessage, currentUser, loadWishlist]);

  const collectionValueRub = pubProfile?.collection_value_rub;
  const monthlyDelta = pubProfile?.monthly_value_delta_rub;

  const wishlistItems = wishlist?.items || [];

  const baseCollection: PublicProfileRecord[] = pubProfile?.collection ?? [];
  const baseWishlist: PublicProfileRecord[] = wishlistItems.map((it) => ({
    ...it.record,
    is_booked: it.is_booked,
  }));

  const applyFilter = useCallback(
    (records: PublicProfileRecord[]) => {
      if (formatFilter === 'all') return records;
      return records.filter((r) => {
        if (!r.format_type) return false;
        const f = r.format_type.toLowerCase();
        if (formatFilter === 'LP') return f.includes('lp') || f.includes('album');
        if (formatFilter === 'EP') return f.includes('ep');
        if (formatFilter === '7"') return f.includes('7"') || f.includes("7''") || f.startsWith('7');
        return true;
      });
    },
    [formatFilter]
  );

  const gridData = useMemo(
    () => applyFilter(activeTab === 'collection' ? baseCollection : baseWishlist),
    [applyFilter, activeTab, baseCollection, baseWishlist]
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={PP.cobalt} />
      </View>
    );
  }

  if (!pubProfile) return null;

  const initials = pubProfile.username.slice(0, 2).toLowerCase();

  const renderGrid = () => {
    if (gridData.length === 0) {
      return (
        <Text style={styles.empty}>
          {activeTab === 'collection' ? 'Коллекция пуста' : 'Вишлист пуст'}
        </Text>
      );
    }
    if (viewMode === 'list') {
      return (
        <View style={styles.list}>
          {gridData.map((r, idx) => {
            const isWishlist = activeTab === 'wishlist';
            const item = isWishlist ? wishlistItems.find((w) => w.record.id === r.id) ?? null : null;
            const reserved = isWishlist ? !!r.is_booked : false;
            return (
              <RecordRowLight
                key={r.id + idx}
                record={r}
                reserved={reserved}
                onPress={() => {
                  if (isWishlist && item && !reserved && !isOwn) tryOpenBooking(item, reserved);
                  else router.push(`/record/${r.id}`);
                }}
              />
            );
          })}
        </View>
      );
    }
    return (
      <View style={styles.grid}>
        {gridData.map((r, idx) => {
          const isWishlist = activeTab === 'wishlist';
          const item = isWishlist ? wishlistItems.find((w) => w.record.id === r.id) ?? null : null;
          const reserved = isWishlist ? !!r.is_booked : false;
          return (
            <RecordCardLight
              key={r.id + idx}
              record={r}
              reserved={reserved}
              onPress={() => {
                if (isWishlist && item && !reserved && !isOwn) tryOpenBooking(item, reserved);
                else router.push(`/record/${r.id}`);
              }}
            />
          );
        })}
      </View>
    );
  };

  const showStickyCTA = !currentUser;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Soft tinted background */}
      <View style={StyleSheet.absoluteFill}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#F5F0EA' }]} />
        <LinearGradient
          colors={['rgba(154,168,255,0.55)', 'rgba(154,168,255,0.12)', 'transparent']}
          start={{ x: 1, y: 0 }} end={{ x: 0.2, y: 0.6 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['rgba(189,212,255,0.45)', 'rgba(189,212,255,0.08)', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0.5 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      {/* Top bar — минимальный */}
      <View style={styles.topbar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="chevron-back" size={22} color={PP.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleShare} style={styles.iconBtn}>
          <Icon name="share-outline" size={18} color={PP.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: showStickyCTA ? 140 : 32 }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={PP.cobalt} />
        }
      >
        {/* HERO — компактный, без винила */}
        <View style={styles.hero}>
          <View style={styles.userRow}>
            <View style={styles.avatarShadow}>
              <LinearGradient
                colors={[PP.blush, PP.lavender, PP.periwinkle, PP.sky]}
                style={styles.avatarRing}
              >
                <View style={styles.avatarInner}>
                  {pubProfile.avatar_url ? (
                    <Image
                      source={resolveMediaUrl(pubProfile.avatar_url)}
                      style={{ width: '100%', height: '100%', borderRadius: 60 }}
                      cachePolicy="disk"
                    />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                </View>
              </LinearGradient>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.username} numberOfLines={1}>@{pubProfile.username}</Text>
              {pubProfile.custom_title ? (
                <Text style={styles.customTitle} numberOfLines={2}>{pubProfile.custom_title}</Text>
              ) : null}
              {pubProfile.bio ? (
                <Text style={styles.bio} numberOfLines={3}>{pubProfile.bio}</Text>
              ) : null}
            </View>
          </View>

          {/* Follow button */}
          {!isOwn && profileUserId ? (
            <TouchableOpacity
              style={[styles.followBtn, following && styles.followBtnActive]}
              onPress={handleFollow}
              disabled={isFollowLoading}
            >
              {isFollowLoading ? (
                <ActivityIndicator size="small" color={following ? PP.cobalt : '#fff'} />
              ) : (
                <>
                  <Icon
                    name={following ? 'checkmark' : 'person-add-outline'}
                    size={16} color={following ? PP.cobalt : '#fff'}
                  />
                  <Text style={[styles.followTxt, following && styles.followTxtActive]}>
                    {following ? 'Вы подписаны' : 'Подписаться'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {/* Stats card */}
          {collectionValueRub != null ? (
            <View style={styles.statsCard}>
              <Text style={styles.statLabel}>Стоимость коллекции</Text>
              <Text style={styles.statValue}>
                {formatRub(displayValue)} <Text style={styles.currency}>₽</Text>
              </Text>
              <View style={styles.statsRow}>
                <View style={styles.statsItem}>
                  <Text style={styles.statsNum}>{pubProfile.collection_count}</Text>
                  <Text style={styles.statsLbl}>в коллекции</Text>
                </View>
                <View style={styles.statsDivider} />
                <View style={styles.statsItem}>
                  <Text style={styles.statsNum}>{pubProfile.wishlist_count}</Text>
                  <Text style={styles.statsLbl}>в вишлисте</Text>
                </View>
                <View style={styles.statsDivider} />
                <View style={styles.statsItem}>
                  <Text style={styles.statsNum}>{pubProfile.followers_count}</Text>
                  <Text style={styles.statsLbl}>подписчиков</Text>
                </View>
              </View>
              {monthlyDelta != null ? (
                <View style={styles.deltaPill}>
                  <Icon
                    name={monthlyDelta >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={11} color={PP.cobalt}
                  />
                  <Text style={styles.deltaText}>
                    {monthlyDelta >= 0 ? '+' : ''}{formatRub(monthlyDelta)} ₽ за месяц
                  </Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.statsRowStandalone}>
              <View style={styles.statsItem}>
                <Text style={styles.statsNum}>{pubProfile.collection_count}</Text>
                <Text style={styles.statsLbl}>в коллекции</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <Text style={styles.statsNum}>{pubProfile.wishlist_count}</Text>
                <Text style={styles.statsLbl}>в вишлисте</Text>
              </View>
              <View style={styles.statsDivider} />
              <View style={styles.statsItem}>
                <Text style={styles.statsNum}>{pubProfile.followers_count}</Text>
                <Text style={styles.statsLbl}>подписчиков</Text>
              </View>
            </View>
          )}
        </View>

        {/* Achievements */}
        <View style={styles.achievementsWrap}>
          <AchievementsBlock username={username} />
        </View>

        {/* Booking hint — только в вишлисте */}
        {activeTab === 'wishlist' && !isOwn ? (
          <View style={styles.bookingHint}>
            <Text style={styles.bookingHintTxt}>
              🔒 Бронь анонимна · 🎁 60 дней · ⏰ напоминание за 7
            </Text>
            {!following ? (
              <Text style={styles.bookingHintSub}>
                Подпишитесь, чтобы бронировать подарки
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* Segmented */}
        <View style={styles.segmentedWrap}>
          <Segmented
            value={activeTab}
            onChange={setActiveTab}
            items={[
              { id: 'collection', label: 'В наличии', count: pubProfile.collection_count },
              { id: 'wishlist', label: 'Вишлист', count: pubProfile.wishlist_count },
            ]}
          />
        </View>

        {/* Toolbar: формат + view toggle */}
        <View style={styles.toolbar}>
          <View style={{ flex: 1, marginRight: 10 }}>
            <FormatChips value={formatFilter} onChange={setFormatFilter} />
          </View>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </View>

        {/* Grid / List */}
        {renderGrid()}
      </ScrollView>

      {/* Sticky CTA — только для неавторизованных deep-link юзеров */}
      {showStickyCTA ? (
        <View pointerEvents="box-none" style={[styles.ctaWrap, { paddingBottom: insets.bottom + 12 }]}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(244,238,230,0)', 'rgba(244,238,230,0.85)', 'rgba(244,238,230,1)']}
            style={styles.ctaFade}
          />
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.cta}
            onPress={() => router.push('/(auth)/register')}
          >
            <Icon name="add-circle-outline" size={18} color="#fff" />
            <Text style={styles.ctaTxt}>Создать свой профиль</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Booking modal — без полей имени/email (берём из учётки) */}
      <Modal
        visible={!!bookingItem}
        transparent
        animationType="slide"
        onRequestClose={() => setBookingItem(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={{ flex: 1 }} />
          </TouchableWithoutFeedback>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Забронировать как подарок</Text>
              <TouchableOpacity onPress={() => setBookingItem(null)}>
                <Icon name="close" size={22} color={PP.ink} />
              </TouchableOpacity>
            </View>
            {bookingItem ? (
              <View style={styles.modalRecRow}>
                <View style={styles.modalRecCover}>
                  {bookingItem.record.cover_image_url ? (
                    <Image
                      source={resolveMediaUrl(bookingItem.record.cover_image_url)}
                      style={{ width: 56, height: 56 }}
                      cachePolicy="disk"
                    />
                  ) : (
                    <LinearGradient
                      colors={[PP.lavender, PP.sky]}
                      style={{ width: 56, height: 56 }}
                    />
                  )}
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={styles.cardArtist}>
                    {bookingItem.record.artist}
                  </Text>
                  <Text numberOfLines={2} style={styles.modalRecTitle}>
                    {bookingItem.record.title}
                  </Text>
                </View>
              </View>
            ) : null}
            <Text style={styles.modalInfo}>
              Бронь анонимная — владелец увидит только метку «Забронировано». Срок 60 дней.
              За 7 дней до истечения мы напомним на email. Если подарок не вручён — бронь
              освободится автоматически.
            </Text>
            {currentUser ? (
              <View style={styles.identityChip}>
                <Icon name="person-circle-outline" size={16} color={PP.cobalt} />
                <Text style={styles.identityTxt} numberOfLines={1}>
                  {(currentUser.display_name || currentUser.username) + ' · ' + currentUser.email}
                </Text>
              </View>
            ) : null}
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="Сообщение владельцу (необязательно)"
              placeholderTextColor={PP.mute}
              value={bookingMessage}
              onChangeText={setBookingMessage}
              multiline
            />
            <TouchableOpacity
              style={[styles.confirmBtn, isBooking && { opacity: 0.55 }]}
              onPress={handleBookGift}
              disabled={isBooking}
            >
              {isBooking ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmBtnTxt}>Подтвердить · бронь на 60 дней</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: PP.ivory },
  center: { alignItems: 'center', justifyContent: 'center' },

  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GRID_PADDING,
    paddingVertical: 8,
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: PP.whiteSoft,
    borderWidth: 1, borderColor: PP.hairline,
  },

  /* HERO */
  hero: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 4,
    paddingBottom: 8,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarShadow: {
    shadowColor: PP.periwinkle,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 10,
  },
  avatarRing: { width: 64, height: 64, borderRadius: 32, padding: 2.5 },
  avatarInner: {
    flex: 1, borderRadius: 60, backgroundColor: PP.pearl,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarInitials: { color: PP.cobalt, fontWeight: '600', fontSize: 18 },
  username: { fontSize: 22, fontWeight: '700', color: PP.ink, letterSpacing: -0.3 },
  customTitle: { fontSize: 12, color: PP.slate, marginTop: 3 },
  bio: { fontSize: 13, color: PP.slate, marginTop: 6, lineHeight: 18 },

  /* Follow button */
  followBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16, marginBottom: 4,
    backgroundColor: PP.cobalt, borderRadius: 14, paddingVertical: 12,
  },
  followBtnActive: {
    backgroundColor: PP.whiteSoft, borderWidth: 1, borderColor: 'rgba(58,75,224,0.25)',
  },
  followTxt: { color: '#fff', fontWeight: '600', fontSize: 14 },
  followTxtActive: { color: PP.cobalt },

  /* Stats card */
  statsCard: {
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 18,
    borderWidth: 1, borderColor: PP.hairline,
    paddingHorizontal: 18, paddingVertical: 16,
    shadowColor: PP.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  statLabel: {
    fontSize: 10, color: PP.slate, textTransform: 'uppercase', letterSpacing: 0.8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 32, fontWeight: '700', color: PP.ink, marginTop: 6, letterSpacing: -0.5,
  },
  currency: { fontSize: 18, color: PP.slate, fontWeight: '500' },
  deltaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.6)',
    borderWidth: 1, borderColor: 'rgba(58,75,224,0.12)',
    alignSelf: 'flex-start',
  },
  deltaText: { fontSize: 11, color: PP.cobalt, fontWeight: '500' },
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1, borderTopColor: PP.hairline,
  },
  statsRowStandalone: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 16,
    paddingVertical: 14, paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 18,
    borderWidth: 1, borderColor: PP.hairline,
  },
  statsItem: { flex: 1, alignItems: 'center' },
  statsNum: { fontSize: 18, fontWeight: '700', color: PP.ink, letterSpacing: -0.2 },
  statsLbl: { fontSize: 10.5, color: PP.mute, marginTop: 3, letterSpacing: 0.2 },
  statsDivider: { width: 1, height: 24, backgroundColor: PP.hairline },

  /* Achievements wrapper */
  achievementsWrap: {
    paddingHorizontal: GRID_PADDING,
    marginTop: 18,
  },

  /* Booking hint */
  bookingHint: {
    marginHorizontal: GRID_PADDING,
    marginTop: 14,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1, borderColor: PP.hairline,
    alignItems: 'center',
  },
  bookingHintTxt: { fontSize: 12, color: PP.slate, fontWeight: '500' },
  bookingHintSub: { fontSize: 11, color: PP.cobalt, fontWeight: '600', marginTop: 4 },

  /* Segmented */
  segmentedWrap: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: GRID_PADDING,
  },
  segmented: {
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 999,
    borderWidth: 1, borderColor: PP.hairline,
    padding: 4,
  },
  segmentedPill: {
    position: 'absolute', top: 4, bottom: 4,
    backgroundColor: '#fff',
    borderRadius: 999,
    borderWidth: 1, borderColor: 'rgba(58,75,224,0.18)',
    shadowColor: PP.cobalt, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8,
  },
  segmentedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999,
  },
  segmentedLabel: { fontSize: 13, fontWeight: '500', color: PP.slate },
  segmentedLabelActive: { color: PP.ink, fontWeight: '600' },
  segmentedCount: {
    paddingHorizontal: 7, paddingVertical: 1, borderRadius: 999,
    backgroundColor: 'rgba(27,29,38,0.06)',
  },
  segmentedCountActive: { backgroundColor: 'rgba(58,75,224,0.12)' },
  segmentedCountTxt: { fontSize: 11, color: PP.mute, fontWeight: '600' },
  segmentedCountTxtActive: { color: PP.cobalt },

  /* Toolbar */
  toolbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
    marginTop: 16,
  },
  formatChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1, borderColor: PP.hairline,
  },
  formatChipActive: {
    backgroundColor: '#fff',
    borderColor: 'rgba(58,75,224,0.30)',
  },
  formatChipTxt: { fontSize: 12, color: PP.slate, fontWeight: '500' },
  formatChipTxtActive: { color: PP.cobalt, fontWeight: '700' },

  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 10,
    borderWidth: 1, borderColor: PP.hairline,
    padding: 2, gap: 2,
  },
  viewToggleBtn: {
    width: 30, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  viewToggleBtnActive: { backgroundColor: '#fff', borderWidth: 1, borderColor: 'rgba(58,75,224,0.20)' },

  /* Grid */
  grid: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16, paddingBottom: 8,
    gap: GRID_GAP,
    rowGap: 18,
  },
  cardCover: {
    width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden',
    backgroundColor: PP.lavender,
    shadowColor: PP.ink, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 12,
  },
  cardArtist: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 9, letterSpacing: 0.6, color: PP.cobalt, fontWeight: '600',
  },
  cardTitle: {
    fontSize: 12, fontWeight: '700', color: PP.ink, marginTop: 3, letterSpacing: -0.2,
  },
  cardPrice: { fontSize: 11, color: PP.cobalt, fontWeight: '600', marginTop: 2 },
  cardInfo: { fontSize: 10.5, color: PP.mute, marginTop: 2 },

  /* List */
  list: {
    paddingHorizontal: GRID_PADDING,
    paddingTop: 16, paddingBottom: 8,
    gap: 10,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12,
    padding: 8, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderWidth: 1, borderColor: PP.hairline,
  },
  rowCover: {
    width: 64, height: 64, borderRadius: 10, overflow: 'hidden',
    backgroundColor: PP.lavender,
  },

  /* Reserved badge */
  reservedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999,
    backgroundColor: 'rgba(201,184,255,0.55)',
    borderWidth: 1, borderColor: 'rgba(154,168,255,0.55)',
    alignSelf: 'flex-start',
  },
  reservedDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: PP.cobalt },
  reservedText: { fontSize: 9, color: PP.cobalt, fontWeight: '700', letterSpacing: 0.4 },

  empty: {
    width: '100%', textAlign: 'center', color: PP.mute, fontSize: 14, paddingVertical: 60,
  },

  /* Sticky CTA — только для гостей */
  ctaWrap: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    paddingTop: 36, paddingHorizontal: GRID_PADDING,
  },
  ctaFade: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
  },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: PP.cobalt,
    paddingHorizontal: 22, paddingVertical: 13,
    borderRadius: 999,
    shadowColor: PP.cobalt, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.45, shadowRadius: 18,
    elevation: 8,
  },
  ctaTxt: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.2 },

  /* Modal */
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(27,29,38,0.32)' },
  modalContent: {
    backgroundColor: PP.pearl, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 22, paddingTop: 12,
  },
  modalHandle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(27,29,38,0.14)', marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: PP.ink, letterSpacing: -0.3 },
  modalRecRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10,
    borderTopWidth: 1, borderTopColor: PP.hairline,
    borderBottomWidth: 1, borderBottomColor: PP.hairline,
    marginBottom: 12,
  },
  modalRecCover: {
    width: 56, height: 56, borderRadius: 10, overflow: 'hidden',
    backgroundColor: PP.lavender,
  },
  modalRecTitle: { fontSize: 14, color: PP.ink, fontWeight: '700', marginTop: 2 },
  modalInfo: { fontSize: 12.5, color: PP.slate, lineHeight: 18, marginBottom: 12 },
  identityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(58,75,224,0.08)',
    borderWidth: 1, borderColor: 'rgba(58,75,224,0.18)',
    marginBottom: 10,
  },
  identityTxt: { flex: 1, fontSize: 12.5, color: PP.cobalt, fontWeight: '500' },
  input: {
    height: 46, paddingHorizontal: 14, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1, borderColor: PP.hairline,
    fontSize: 14, color: PP.ink,
    marginBottom: 10,
  },
  textarea: { height: 80, paddingTop: 12, textAlignVertical: 'top' },
  confirmBtn: {
    marginTop: 8, height: 50, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: PP.cobalt,
    shadowColor: PP.cobalt, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 14,
  },
  confirmBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
