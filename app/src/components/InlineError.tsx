import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colors, radius } from '../theme';

export function InlineError({ message }: { message: string | null | undefined }) {
  if (!message) return null;
  return (
    <View style={styles.box} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Ionicons name="alert-circle" size={18} color={colors.error} style={styles.icon} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.errorSoft,
    borderRadius: radius.sm,
    padding: 12,
  },
  icon: { marginTop: 1 },
  text: { flex: 1, color: colors.error, fontSize: 14, fontWeight: '600', lineHeight: 20 },
});
