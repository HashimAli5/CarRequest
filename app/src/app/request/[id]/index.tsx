import React, { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { AlternativeResponse } from '../../../components/AlternativeResponse';
import { ApproverActions } from '../../../components/ApproverActions';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { EmptyState } from '../../../components/EmptyState';
import { FadeIn } from '../../../components/FadeIn';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { TimeCompare } from '../../../components/TimeCompare';
import { useCurrentUser } from '../../../context/AuthContext';
import { useRequests } from '../../../context/RequestsContext';
import { ApiError } from '../../../lib/api';
import { STATUS_META } from '../../../lib/status';
import { formatDateLong, formatRange, formatTimestamp, isPastDate } from '../../../lib/time';
import { CarRequest, displayReason, Role } from '../../../lib/types';
import { colors, font, radius } from '../../../theme';
import { LoadingRow } from '../../../screens/HomeHeader';

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const { getById, fetchOne } = useRequests();
  const request = getById(id);
  const [state, setState] = useState<'idle' | 'loading' | 'notFound' | 'error'>('idle');
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      await fetchOne(id);
      setState('idle');
    } catch (err) {
      setState(err instanceof ApiError && err.status === 404 ? 'notFound' : 'error');
    }
  };

  // Always fetch the latest copy (e.g. when opened from a notification).
  useEffect(() => {
    if (!request) setState('loading');
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Car Request" />
      {request ? (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
            />
          }
        >
          <Details request={request} role={user.role} />
        </ScrollView>
      ) : state === 'notFound' ? (
        <EmptyState icon="help-circle-outline" title="Request not found" subtitle="It may have been removed." />
      ) : state === 'error' ? (
        <View style={styles.content}>
          <EmptyState icon="cloud-offline-outline" title="Couldn't load this request" subtitle="Check your connection.">
            <Button title="Try Again" icon="refresh" variant="secondary" onPress={() => void load()} />
          </EmptyState>
        </View>
      ) : (
        <LoadingRow text="Loading request…" />
      )}
    </SafeAreaView>
  );
}

function Details({ request: r, role }: { request: CarRequest; role: Role }) {
  const meta = STATUS_META[r.status];
  const reason = displayReason(r);
  const past = isPastDate(r.requestedDate);
  const hasAlt = !!(r.alternativeStartTime && r.alternativeEndTime);
  const other = role === 'APPROVER' ? r.requesterName : r.approverName;

  const statusText: Record<CarRequest['status'], string> = {
    PENDING: role === 'APPROVER' ? 'Waiting for your decision.' : `Waiting for ${r.approverName} to respond.`,
    APPROVED: role === 'APPROVER' ? `${r.requesterName} can use the car.` : 'Enjoy the ride. Drive safe!',
    REJECTED: role === 'APPROVER' ? 'You rejected this request.' : `${other} rejected this request.`,
    ALTERNATIVE_PROPOSED:
      role === 'APPROVER'
        ? `You suggested another time. Waiting for ${r.requesterName} to respond.`
        : `${other} can't make the car available during your requested time, but it is available during the suggested time.`,
    DECLINED:
      role === 'APPROVER'
        ? `${r.requesterName} declined your suggested time. (Not a rejection by you.)`
        : 'You declined the suggested time.',
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Status hero */}
      <FadeIn>
        <View style={[styles.hero, { backgroundColor: meta.soft }]}>
          <View style={[styles.heroIcon, { backgroundColor: meta.color }]}>
            <Ionicons name={meta.icon} size={26} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.heroLabel, { color: meta.color }]}>
              {r.status === 'ALTERNATIVE_PROPOSED' ? 'Alternative Suggested' : meta.label}
            </Text>
            <Text style={styles.heroText}>{statusText[r.status]}</Text>
            {r.status === 'ALTERNATIVE_PROPOSED' && role === 'REQUESTER' && !past ? (
              <Text style={[styles.heroText, { fontWeight: '700', marginTop: 4 }]}>
                Still waiting for your response.
              </Text>
            ) : null}
          </View>
        </View>
      </FadeIn>

      {/* Requester: respond to a suggestion */}
      {role === 'REQUESTER' && r.status === 'ALTERNATIVE_PROPOSED' && hasAlt ? (
        <FadeIn delay={60}>
          <Card style={{ gap: 16, borderColor: colors.alternative + '55', borderWidth: 1.5 }}>
            <Text style={font.h3}>{formatDateLong(r.requestedDate)}</Text>
            <TimeCompare
              requestedStart={r.requestedStartTime}
              requestedEnd={r.requestedEndTime}
              suggestedStart={r.alternativeStartTime!}
              suggestedEnd={r.alternativeEndTime!}
            />
            {past ? (
              <Text style={styles.pastNote}>This date has passed, so the suggestion has expired.</Text>
            ) : (
              <AlternativeResponse request={r} />
            )}
          </Card>
        </FadeIn>
      ) : null}

      {/* Final agreed time */}
      {r.status === 'APPROVED' && r.finalStartTime && r.finalEndTime ? (
        <FadeIn delay={60}>
          <View style={styles.final}>
            <Text style={[styles.rowLabel, { color: colors.success }]}>Final Agreed Time</Text>
            <Text style={styles.finalTime}>{formatRange(r.finalStartTime, r.finalEndTime)}</Text>
            <Text style={styles.finalDate}>{formatDateLong(r.requestedDate)}</Text>
          </View>
        </FadeIn>
      ) : null}

      {/* Rejection reason */}
      {r.status === 'REJECTED' && r.rejectionReason ? (
        <FadeIn delay={60}>
          <View style={styles.rejection}>
            <Text style={[styles.rowLabel, { color: colors.error }]}>Rejection Reason</Text>
            <Text style={styles.quote}>“{r.rejectionReason}”</Text>
          </View>
        </FadeIn>
      ) : null}

      {/* Facts */}
      <FadeIn delay={100}>
        <Card style={{ paddingVertical: 6 }}>
          <Row label="Requester" value={r.requesterName} icon="person" />
          <Row label="Date" value={formatDateLong(r.requestedDate)} icon="calendar" />
          <Row
            label="Originally Requested"
            value={formatRange(r.requestedStartTime, r.requestedEndTime)}
            icon="time"
          />
          {hasAlt ? (
            <Row
              label="Alternative Time"
              value={formatRange(r.alternativeStartTime!, r.alternativeEndTime!)}
              icon="swap-horizontal"
              color={colors.alternative}
            />
          ) : null}
          <Row label="Reason" value={reason ?? 'No reason given'} icon="chatbubble-ellipses" last />
        </Card>
      </FadeIn>

      {/* Timeline */}
      <FadeIn delay={140}>
        <Card>
          <Text style={[font.label, { marginBottom: 10 }]}>Timeline</Text>
          <TimelineItem label="Request sent" at={r.createdAt} />
          {r.alternativeProposedAt ? <TimelineItem label="Alternative suggested" at={r.alternativeProposedAt} /> : null}
          {r.alternativeRespondedAt ? (
            <TimelineItem
              label={r.status === 'DECLINED' ? 'Suggestion declined' : 'Suggestion accepted'}
              at={r.alternativeRespondedAt}
            />
          ) : null}
          {r.decisionAt && !r.alternativeRespondedAt ? (
            <TimelineItem label={r.status === 'REJECTED' ? 'Rejected' : 'Approved'} at={r.decisionAt} />
          ) : null}
          {r.decisionAt && r.alternativeRespondedAt ? (
            <TimelineItem label="Decision final" at={r.decisionAt} />
          ) : null}
        </Card>
      </FadeIn>

      {/* Approver: decide */}
      {role === 'APPROVER' && r.status === 'PENDING' ? (
        <FadeIn delay={180}>
          {past ? (
            <Text style={styles.pastNote}>This date has already passed.</Text>
          ) : (
            <ApproverActions request={r} />
          )}
        </FadeIn>
      ) : null}
    </View>
  );
}

function Row({
  label,
  value,
  icon,
  color,
  last,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Ionicons name={icon} size={18} color={color ?? colors.textMuted} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={[styles.rowValue, color ? { color } : null]}>{value}</Text>
      </View>
    </View>
  );
}

function TimelineItem({ label, at }: { label: string; at: string }) {
  return (
    <View style={styles.tlRow}>
      <View style={styles.tlDot} />
      <Text style={styles.tlLabel}>{label}</Text>
      <Text style={styles.tlAt}>{formatTimestamp(at)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },

  hero: { flexDirection: 'row', gap: 14, borderRadius: radius.lg, padding: 16, alignItems: 'flex-start' },
  heroIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontSize: 18, fontWeight: '800' },
  heroText: { ...font.body, color: colors.text, marginTop: 3, lineHeight: 21 },

  final: {
    backgroundColor: colors.successSoft,
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 1.5,
    borderColor: colors.success + '40',
  },
  finalTime: { fontSize: 28, fontWeight: '800', color: colors.success, letterSpacing: -0.6, marginTop: 4 },
  finalDate: { ...font.muted, marginTop: 2 },

  rejection: { backgroundColor: colors.errorSoft, borderRadius: radius.lg, padding: 18 },
  quote: { fontSize: 17, fontWeight: '600', color: colors.text, marginTop: 6, lineHeight: 24 },

  row: { flexDirection: 'row', gap: 12, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { ...font.label, fontSize: 11 },
  rowValue: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 2 },

  tlRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  tlDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  tlLabel: { flex: 1, fontSize: 14, color: colors.text, fontWeight: '500' },
  tlAt: { fontSize: 13, color: colors.textMuted },

  pastNote: { ...font.muted, textAlign: 'center' },
});
