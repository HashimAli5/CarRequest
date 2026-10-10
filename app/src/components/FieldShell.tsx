import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius } from '../theme';
import { PressableScale } from './PressableScale';

type Props = {
  label: string;
  value: string | null;
  placeholder: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  error?: string | null;
  disabled?: boolean;
};

/** Tappable form field that opens a picker. */
export function FieldShell({ label, value, placeholder, icon, onPress, error, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        scaleTo={0.985}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ?? placeholder}`}
        style={[styles.field, !!error && styles.fieldError, disabled && { opacity: 0.5 }]}
      >
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
          <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
            {value ?? placeholder}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textFaint} />
        </View>
      </PressableScale>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export const fieldStyles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
});

const styles = StyleSheet.create({
  wrap: { gap: 0 },
  label: fieldStyles.label,
  field: {
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  fieldError: { borderColor: colors.error },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  placeholder: { color: colors.textFaint, fontWeight: '500' },
  error: { color: colors.error, fontSize: 13, fontWeight: '600', marginTop: 6 },
});
