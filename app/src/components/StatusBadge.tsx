import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { STATUS_META } from '../lib/status';
import type { RequestStatus } from '../lib/types';
import { radius } from '../theme';

/** Status shown with icon + text + color (never color alone). */
export function StatusBadge({ status, size = 'md' }: { status: RequestStatus; size?: 'sm' | 'md' }) {
  const meta = STATUS_META[status];
  return (
    <View
      style={[styles.badge, size === 'sm' && styles.sm, { backgroundColor: meta.soft }]}
      accessibilityLabel={`Status: ${meta.label}`}
    >
      <Ionicons name={meta.icon} size={size === 'sm' ? 13 : 15} color={meta.color} />
      <Text style={[styles.text, size === 'sm' && styles.textSm, { color: meta.color }]}>
        {meta.label.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  sm: { paddingHorizontal: 8, paddingVertical: 4 },
  text: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  textSm: { fontSize: 11 },
});
