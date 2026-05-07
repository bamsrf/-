import { StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/ui';
import type { BaseToastProps } from 'react-native-toast-message';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../constants/theme';

type Variant = 'success' | 'error' | 'info';

const VARIANTS: Record<Variant, { accent: string; tint: string; icon: string }> = {
  success: {
    accent: Colors.success,
    tint: 'rgba(48, 164, 108, 0.12)',
    icon: 'checkmark-circle',
  },
  error: {
    accent: Colors.error,
    tint: 'rgba(229, 72, 77, 0.12)',
    icon: 'alert-circle',
  },
  info: {
    accent: Colors.royalBlue,
    tint: 'rgba(59, 75, 245, 0.12)',
    icon: 'information-circle',
  },
};

function CustomToast({ variant, text1, text2 }: { variant: Variant; text1?: string; text2?: string }) {
  const { accent, tint, icon } = VARIANTS[variant];

  return (
    <View style={styles.wrapper} pointerEvents="box-none">
      <View style={styles.card}>
        <View style={[styles.accentBar, { backgroundColor: accent }]} />
        <View style={[styles.iconWrap, { backgroundColor: tint }]}>
          <Icon name={icon} size={22} color={accent} />
        </View>
        <View style={styles.textWrap}>
          {!!text1 && (
            <Text style={styles.title} numberOfLines={2}>
              {text1}
            </Text>
          )}
          {!!text2 && (
            <Text style={styles.subtitle} numberOfLines={2}>
              {text2}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export const toastConfig = {
  success: (props: BaseToastProps) => (
    <CustomToast variant="success" text1={props.text1} text2={props.text2} />
  ),
  error: (props: BaseToastProps) => (
    <CustomToast variant="error" text1={props.text1} text2={props.text2} />
  ),
  info: (props: BaseToastProps) => (
    <CustomToast variant="info" text1={props.text1} text2={props.text2} />
  ),
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    paddingHorizontal: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.lg,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.lg,
  },
  accentBar: {
    position: 'absolute',
    left: 6,
    top: 12,
    bottom: 12,
    width: 4,
    borderRadius: BorderRadius.full,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    ...Typography.bodyBold,
    color: Colors.text,
  },
  subtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
