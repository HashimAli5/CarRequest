import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { formatDateShort, formatRange, timeAgo } from '../lib/time';
import { CarRequest, displayReason, Role } from '../lib/types';
import { colors, radius, shadow } from '../theme';
import { PressableScale } from './PressableScale';
import { StatusBadge } from './StatusBadge';

/** Compact history card. Tapping opens the request details. */
export function RequestCard({ request: r, role }: { request: CarRequest; role: Role }) {
  const reason = displayReason(r);
  const hasAlt = !!(r.alternativeStartTime && r.alternativeEndTime);
  const finalDiffers =
    r.status === 'APPROVED' &&
    r.finalStartTime &&
    (r.finalStartTime !== r.requestedStartTime || r.finalEndTime !== r.requestedEndTime);

  return (
    <PressableScale
      onPress={() => router.push(`/request/${r.id}`)}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Request for ${formatDateShort(r.requestedDate)}, ${r.status}`}
      style={styles.card}
    >
      <View style={styles.top}>
        <Text style={styles.date}>{formatDateShort(r.requestedDate)}</Text>
        <StatusBadge status={r.status} size="sm" />
      </View>

      {hasAlt ? (
        <View style={styles.times}>
          <TimeLine label="Requested" value={formatRange(r.requestedStartTime, r.requestedEndTime)} muted />
          <TimeLine
            label={finalDiffers ? 'Agreed' : 'Suggested'}
            value={formatRange(r.alternativeStartTime!, r.alternativeEndTime!)}
            color={finalDiffers ? colors.success : colors.alternative}
          />
        </View>
      ) : (
        <Text style={styles.time}>{formatRange(r.requestedStartTime, r.requestedEndTime)}</Text>
      )}

      <View style={styles.bottom}>
        <View style={styles.meta}>
          {reason ? (
            <>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.textMuted} />
              <Text style={styles.reason} numberOfLines={1}>
                {reason}
              </Text>
            </>
          ) : (
            <Text style={styles.reason}>No reason given</Text>
          )}
        </View>
        <Text style={styles.ago}>
          {role === 'APPROVER' ? `${r.requesterName} · ` : ''}
          {timeAgo(r.createdAt)}
        </Text>
      </View>
    </PressableScale>
  );
}

function TimeLine({ label, value, muted, color }: { label: string; value: string; muted?: boolean; color?: string }) {
  return (
    <View style={styles.timeLine}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={[styles.timeSmall, muted && styles.muted, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  date: { fontSize: 15, fontWeight: '700', color: colors.text },
  time: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 8, letterSpacing: -0.3 },
  times: { marginTop: 8, gap: 4 },
  timeLine: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  timeLabel: { width: 78, fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' },
  timeSmall: { fontSize: 16, fontWeight: '700', color: colors.text },
  muted: { color: colors.textMuted },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  reason: { fontSize: 14, color: colors.textMuted, flexShrink: 1 },
  ago: { fontSize: 12, color: colors.textFaint },
});
