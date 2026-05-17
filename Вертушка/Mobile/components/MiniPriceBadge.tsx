/**
 * MiniPriceBadge — компактный price-индикатор для карусели «В наличии сейчас»
 * на экране поиска (OFFERS_UX.md Фича 4).
 *
 * Намеренно минималистичный: точка-винил (Phosphor `disc`, цвет ember) +
 * число с «₽» и tabular-numbers. Полноценный gradient-pill (`HotStockTag`)
 * в плотной горизонтальной карусели был бы избыточен — мы рассчитываем что
 * пользователь уже понимает контекст из заголовка секции «В НАЛИЧИИ СЕЙЧАС».
 */
import { Text, View, StyleSheet, Platform } from 'react-native';
import { Icon } from './ui';

const EMBER = '#E85A2A'; // accent.ember (light) из theme — единственный «огненный» акцент в кадре

interface MiniPriceBadgeProps {
  /** Цена в рублях. Округляется до целого, разделители тысяч — неразрывный пробел. */
  price: number;
}

export function MiniPriceBadge({ price }: MiniPriceBadgeProps) {
  const rounded = Math.max(0, Math.round(price));
  // U+00A0 (неразрывный пробел) — чтобы «4 990 ₽» не переносился по строкам
  const formatted = rounded.toLocaleString('ru-RU').replace(/\s/g, ' ');

  return (
    <View style={styles.row}>
      <Icon name="disc" size={11} color={EMBER} />
      <Text style={styles.price} numberOfLines={1}>
        {formatted}{' '}₽
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  price: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B1D26', // соответствует ink-tone из AutoRail
    // Моноширинные цифры → цена не дрожит при апдейтах
    fontVariant: Platform.OS === 'ios' ? ['tabular-nums'] : undefined,
    fontFamily: Platform.OS === 'android' ? 'monospace' : undefined,
    letterSpacing: -0.2,
  },
});

export default MiniPriceBadge;
