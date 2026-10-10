import React from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '../theme';
import { PressableScale } from './PressableScale';

type Variant =
  | 'primary'
  | 'success'
  | 'danger'
  | 'dangerSolid'
  | 'alternative'
  | 'alternativeSolid'
  | 'secondary'
  | 'ghost';

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.white },
  success: { bg: colors.success, fg: colors.white },
  danger: { bg: colors.errorSoft, fg: colors.error },
  dangerSolid: { bg: colors.error, fg: colors.white },
  alternative: { bg: colors.alternativeSoft, fg: colors.alternative },
  alternativeSolid: { bg: colors.alternative, fg: colors.white },
  secondary: { bg: colors.card, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.textMuted },
};

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  /** Text shown next to the spinner while loading, e.g. "Approving…" */
  loadingTitle?: string;
  disabled?: boolean;
  size?: 'lg' | 'md';
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  loadingTitle,
  disabled,
  size = 'lg',
  style,
  accessibilityHint,
}: Props) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <PressableScale
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        onPress();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      style={[
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: v.bg, borderColor: v.border ?? 'transparent' },
        disabled && !loading && styles.disabled,
        style,
      ]}
    >
      <View style={styles.row}>
        {loading ? (
          <ActivityIndicator color={v.fg} size="small" />
        ) : icon ? (
          <Ionicons name={icon} size={size === 'lg' ? 20 : 18} color={v.fg} />
        ) : null}
        <Text style={[styles.text, size === 'md' && styles.textMd, { color: v.fg }]} numberOfLines={1}>
          {loading && loadingTitle ? loadingTitle : title}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  lg: { minHeight: 54 },
  md: { minHeight: 46 },
  disabled: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { fontSize: 16, fontWeight: '700', letterSpacing: -0.1 },
  textMd: { fontSize: 15 },
});
