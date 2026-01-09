/**
 * Дизайн-система Вертушка
 * Nike-inspired: минимализм, воздух, крупная типографика
 */

export const Colors = {
  // Основные цвета
  background: '#FFFFFF',
  surface: '#F5F5F5',
  primary: '#1A1A1A',
  accent: '#8B7355',
  secondary: '#E8E4DF',
  
  // Текст
  text: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textMuted: '#9B9B9B',
  
  // Состояния
  error: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
  
  // Границы и разделители
  border: '#E5E5E5',
  divider: '#F0F0F0',
  
  // Прозрачности
  overlay: 'rgba(0, 0, 0, 0.5)',
  cardShadow: 'rgba(0, 0, 0, 0.08)',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  // Заголовки
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  h3: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  
  // Тело текста
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  
  // Подписи
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  
  // Кнопки
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  buttonSmall: {
    fontSize: 14,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
};

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Константы для компонентов
export const ComponentSizes = {
  // Кнопки
  buttonHeight: 56,
  buttonHeightSmall: 44,
  
  // Инпуты
  inputHeight: 56,
  
  // Карточки
  cardPadding: Spacing.md,
  
  // Tab bar
  tabBarHeight: 84,
  
  // Header
  headerHeight: 56,
  
  // Иконки
  iconSm: 20,
  iconMd: 24,
  iconLg: 32,
};

export default {
  Colors,
  Spacing,
  BorderRadius,
  Typography,
  Shadows,
  ComponentSizes,
};
