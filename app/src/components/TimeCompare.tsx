import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatRange } from '../lib/time';
import { colors, radius } from '../theme';

type Props = {
  requestedStart: string;
  requestedEnd: string;
  suggestedStart: string;
  suggestedEnd: string;
  suggestedLabel?: string;
};

/** "Your requested time" vs "Suggested time", side by side. */
export function TimeCompare({
  requestedStart,
  requestedEnd,
  suggestedStart,
  suggestedEnd,
  suggestedLabel = 'Suggested time',
}: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.box, styles.requested]}>
        <Text style={styles.label}>Requested</Text>
        <Text style={[styles.time, styles.timeRequested]}>{formatRange(requestedStart, requestedEnd)}</Text>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="arrow-down" size={16} color={colors.alternative} />
      </View>
      <View style={[styles.box, styles.suggested]}>
        <Text style={[styles.label, { color: colors.alternative }]}>{suggestedLabel}</Text>
        <Text style={[styles.time, { color: colors.alternative }]}>{formatRange(suggestedStart, suggestedEnd)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'stretch' },
  box: { borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14 },
  requested: { backgroundColor: colors.neutralSoft },
  suggested: { backgroundColor: colors.alternativeSoft, borderWidth: 1.5, borderColor: colors.alternative + '40' },
  label: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  time: { fontSize: 20, fontWeight: '800', marginTop: 2, letterSpacing: -0.3 },
  timeRequested: { color: colors.textMuted, textDecorationLine: 'line-through' },
  arrow: { alignSelf: 'center', marginVertical: -6, zIndex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 3 },
});
