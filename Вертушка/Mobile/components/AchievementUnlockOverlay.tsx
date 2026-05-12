/**
 * AchievementUnlockOverlay — модальная анимация открытия ачивки.
 *
 * Использование:
 * 1) В корне приложения (`app/_layout.tsx`) монтируется один экземпляр
 *    `<AchievementUnlockHost />`, который слушает события из `achievementBus`.
 * 2) Из любого места (API-обработчики, эмитящие unlock) вызываем
 *    `notifyAchievementUnlocked(codes, fetchOptions?)` — хост подгружает
 *    данные ачивок через API и показывает overlay по одной.
 *
 * Анимация:
 * - Затемнение фона
 * - Pin падает и вращается 360°
 * - Появляется лента с названием
 * - Кнопки «Поделиться» / «Закрыть»
 */
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Animated,
  Easing,
  TouchableOpacity,
  Dimensions,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../lib/api';
import { AchievementPin } from './AchievementPin';
import type { AchievementItem } from '../lib/types';

// ─── Event bus ──────────────────────────────────────────────────────────────

type Listener = (codes: string[]) => void;
const _listeners: Set<Listener> = new Set();

export function notifyAchievementUnlocked(codes: string[]) {
  if (!codes || codes.length === 0) return;
  _listeners.forEach((cb) => {
    try {
      cb(codes);
    } catch {
      // ignore
    }
  });
}

function subscribe(cb: Listener): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

// ─── Host ──────────────────────────────────────────────────────────────────

export function AchievementUnlockHost() {
  const [queue, setQueue] = useState<AchievementItem[]>([]);
  const [current, setCurrent] = useState<AchievementItem | null>(null);

  useEffect(() => {
    return subscribe(async (codes) => {
      // На каждый анлок дёргаем /me и оставляем только переданные коды.
      try {
        const my = await api.getMyAchievements();
        const lookup = new Map<string, AchievementItem>();
        for (const s of my.series) for (const it of s.items) lookup.set(it.code, it);
        // Рандомные приходят отдельным эндпоинтом
        const random = await api.getMyRandomUnlocked();
        for (const it of random.items) lookup.set(it.code, it);

        const items = codes
          .map((c) => lookup.get(c))
          .filter((x): x is AchievementItem => Boolean(x) && x!.is_unlocked);
        if (items.length > 0) {
          setQueue((prev) => [...prev, ...items]);
        }
      } catch {
        // тихо
      }
    });
  }, []);

  // Если очередь не пустая и сейчас ничего не показывается — берём следующее
  useEffect(() => {
    if (!current && queue.length > 0) {
      setCurrent(queue[0]);
      setQueue((prev) => prev.slice(1));
    }
  }, [current, queue]);

  if (!current) return null;

  return (
    <UnlockModal
      item={current}
      onDismiss={() => setCurrent(null)}
    />
  );
}

// ─── Modal ─────────────────────────────────────────────────────────────────

function UnlockModal({ item, onDismiss }: { item: AchievementItem; onDismiss: () => void }) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const pinScale = useRef(new Animated.Value(0)).current;
  const pinRotate = useRef(new Animated.Value(0)).current;
  const pinTranslateY = useRef(new Animated.Value(-100)).current;
  const ribbonOpacity = useRef(new Animated.Value(0)).current;
  const ribbonTranslateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdrop, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pinTranslateY, {
            toValue: 0,
            duration: 700,
            easing: Easing.bezier(0.25, 1.4, 0.5, 1.0),
            useNativeDriver: true,
          }),
          Animated.timing(pinScale, {
            toValue: 1,
            duration: 700,
            easing: Easing.bezier(0.2, 1.2, 0.5, 1),
            useNativeDriver: true,
          }),
          Animated.timing(pinRotate, {
            toValue: 1,
            duration: 900,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(ribbonOpacity, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(ribbonTranslateY, {
            toValue: 0,
            duration: 350,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [item.code]);

  const handleDismiss = () => {
    Animated.timing(backdrop, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  const handleShare = async () => {
    try {
      // Пока без реальной share-card картинки — текстовый шер.
      // Когда дизайнер сдаст SVG-пины, переключим на fetchShareCardPng() +
      // expo-sharing / react-native-view-shot.
      await Share.share({
        message: `Открыл ачивку «${item.title_ru}» в Вертушке 🎵`,
      });
    } catch {
      // отмена пользователем — ок
    }
  };

  const rotateInterp = pinRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal transparent visible animationType="none" onRequestClose={handleDismiss} statusBarTranslucent>
      <Animated.View
        style={[
          styles.backdrop,
          { opacity: backdrop, backgroundColor: backdropColor(item) },
        ]}
      >
        <View style={styles.center} pointerEvents="box-none">
          <Text style={styles.eyebrow}>Открыта новая ачивка</Text>
          <Animated.View
            style={{
              transform: [
                { translateY: pinTranslateY },
                { scale: pinScale },
                { rotate: rotateInterp },
              ],
            }}
          >
            <AchievementPin item={item} size={140} />
          </Animated.View>
          <Animated.View
            style={[
              styles.ribbon,
              {
                opacity: ribbonOpacity,
                transform: [{ translateY: ribbonTranslateY }],
              },
            ]}
          >
            <Text style={styles.title}>{item.title_ru || '❓ Сюрприз'}</Text>
            <View style={[styles.tierChip, { borderColor: item.tier.color_hex }]}>
              <Text style={[styles.tierChipText, { color: '#FFFFFF' }]}>
                {item.tier.label_ru}
              </Text>
            </View>
            {item.flavor_ru && (
              <Text style={styles.flavor}>«{item.flavor_ru}»</Text>
            )}
          </Animated.View>
          <Animated.View style={[styles.actions, { opacity: ribbonOpacity }]}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#FFFFFF" />
              <Text style={styles.btnPrimaryText}>Поделиться</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnSecondary} onPress={handleDismiss}>
              <Text style={styles.btnSecondaryText}>Дальше</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </Modal>
  );
}

function backdropColor(item: AchievementItem): string {
  // Тёмные тиры — почти чёрный backdrop, светлые — насыщенный синий.
  const k = item.tier.key;
  if (k === 'legend' || k === 'epic') return 'rgba(10, 11, 30, 0.92)';
  if (k === 'rare') return 'rgba(60, 22, 60, 0.88)';
  return 'rgba(20, 30, 80, 0.85)';
}

const { width: SCREEN_W } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    marginBottom: 32,
    fontWeight: '600',
  },
  ribbon: {
    marginTop: 32,
    alignItems: 'center',
    maxWidth: SCREEN_W - 80,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
  },
  tierChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  tierChipText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  flavor: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  actions: {
    marginTop: 40,
    flexDirection: 'row',
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#3B4BF5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  btnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  btnSecondaryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
