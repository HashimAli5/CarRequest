import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { EmptyState } from '../components/EmptyState';
import { FadeIn } from '../components/FadeIn';
import { InlineError } from '../components/InlineError';
import { PressableScale } from '../components/PressableScale';
import { StatusBadge } from '../components/StatusBadge';
import { TimeCompare } from '../components/TimeCompare';
import { useCurrentUser } from '../context/AuthContext';
import { useRequests } from '../context/RequestsContext';
import { formatDateLong, formatRange, friendlyDay, isPastDate } from '../lib/time';
import { CarRequest, displayReason } from '../lib/types';
import { colors, font, radius } from '../theme';
import { HomeHeader, LoadingRow, SectionTitle } from './HomeHeader';

export function RequesterHome() {
  const approverName = useCurrentUser().partnerName ?? 'your brother';
  const { requests, loadState, refresh } = useRequests();
  const [refreshing, setRefreshing] = useState(false);

  const proposals = requests.filter((r) => r.status === 'ALTERNATIVE_PROPOSED' && !isPastDate(r.requestedDate));
  const latest = requests.find((r) => !proposals.includes(r));
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <HomeHeader />
        <ConnectionBanner />

        <FadeIn>
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <Ionicons name="car-sport" size={30} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Need the car?</Text>
            <Text style={styles.heroText}>Ask {approverName} for permission.</Text>
            <PressableScale
              onPress={() => router.push('/request/new')}
              accessibilityRole="button"
              accessibilityLabel="Request the Car"
              style={styles.heroButton}
            >
              <View style={styles.heroButtonRow}>
                <Ionicons name="key" size={20} color={colors.primary} />
                <Text style={styles.heroButtonText}>Request the Car</Text>
              </View>
            </PressableScale>
          </View>
        </FadeIn>

        {proposals.map((r, i) => (
          <FadeIn key={r.id} delay={80 + i * 60}>
            <ProposalCard request={r} />
          </FadeIn>
        ))}

        <SectionTitle
          right={
            pendingCount > 1 ? (
              <Text style={styles.link} onPress={() => router.push('/requests')}>
                {pendingCount} pending
              </Text>
            ) : null
          }
        >
          Latest Request
        </SectionTitle>

        {loadState === 'loading' || loadState === 'idle' ? (
          <LoadingRow text="Loading requests…" />
        ) : loadState === 'error' ? (
          <View style={{ gap: 12 }}>
            <InlineError message="Couldn't load your requests. Please check your connection." />
            <Button title="Try Again" variant="secondary" icon="refresh" onPress={() => void refresh()} />
          </View>
        ) : latest ? (
          <FadeIn delay={120}>
            <LatestCard request={latest} />
          </FadeIn>
        ) : proposals.length === 0 ? (
          <EmptyState icon="car-outline" title="No requests yet" subtitle={'Need the car?\nSend your first request.'} />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProposalCard({ request: r }: { request: CarRequest }) {
  return (
    <Card style={styles.proposal}>
      <View style={styles.proposalHead}>
        <View style={styles.proposalIcon}>
          <Ionicons name="swap-horizontal" size={20} color={colors.white} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.proposalTitle}>Alternative Time Suggested</Text>
          <Text style={styles.proposalDate}>{formatDateLong(r.requestedDate)}</Text>
        </View>
      </View>
      <Text style={styles.proposalText}>
        {r.approverName} can't make the car available during your requested time.
      </Text>
      <TimeCompare
        requestedStart={r.requestedStartTime}
        requestedEnd={r.requestedEndTime}
        suggestedStart={r.alternativeStartTime!}
        suggestedEnd={r.alternativeEndTime!}
        suggestedLabel="Available"
      />
      <Button
        title="View Request"
        icon="arrow-forward"
        variant="alternativeSolid"
        style={{ marginTop: 14 }}
        onPress={() => router.push(`/request/${r.id}`)}
      />
    </Card>
  );
}

function LatestCard({ request: r }: { request: CarRequest }) {
  const reason = displayReason(r);
  const finalTime =
    r.status === 'APPROVED' && r.finalStartTime && r.finalEndTime ? formatRange(r.finalStartTime, r.finalEndTime) : null;

  return (
    <PressableScale onPress={() => router.push(`/request/${r.id}`)} scaleTo={0.98} accessibilityRole="button">
      <Card>
        <View style={styles.latestTop}>
          <Text style={styles.latestDay}>{friendlyDay(r.requestedDate)}</Text>
          <StatusBadge status={r.status} />
        </View>
        <Text style={styles.latestDate}>{formatDateLong(r.requestedDate)}</Text>
        <Text style={styles.latestTime}>{formatRange(r.requestedStartTime, r.requestedEndTime)}</Text>
        {reason ? (
          <View style={styles.reasonRow}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={colors.textMuted} />
            <Text style={styles.reason}>{reason}</Text>
          </View>
        ) : null}

        {r.status === 'PENDING' ? (
          <Note icon="time-outline" color={colors.pending} text={`Waiting for ${r.approverName} to respond.`} />
        ) : finalTime ? (
          <Note icon="checkmark-circle" color={colors.success} text={`Final agreed time: ${finalTime}`} />
        ) : r.status === 'REJECTED' ? (
          <Note icon="close-circle" color={colors.error} text={`“${r.rejectionReason}”`} />
        ) : r.status === 'DECLINED' ? (
          <Note icon="remove-circle" color={colors.neutral} text="You declined the suggested time." />
        ) : null}
      </Card>
    </PressableScale>
  );
}

function Note({ icon, color, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; text: string }) {
  return (
    <View style={[styles.note, { backgroundColor: color + '14' }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[styles.noteText, { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },

  hero: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    padding: 22,
    overflow: 'hidden',
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  heroTitle: { fontSize: 24, fontWeight: '800', color: colors.white, letterSpacing: -0.4 },
  heroText: { fontSize: 15, color: '#E0E7FF', marginTop: 4 },
  heroButton: {
    marginTop: 18,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroButtonText: { fontSize: 16, fontWeight: '800', color: colors.primary },

  proposal: { marginTop: 16, borderColor: colors.alternative + '55', borderWidth: 1.5 },
  proposalHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  proposalIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.alternative,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proposalTitle: { ...font.h3, color: colors.alternative },
  proposalDate: { ...font.muted, marginTop: 1 },
  proposalText: { ...font.body, color: colors.textMuted, marginBottom: 14, lineHeight: 21 },

  link: { color: colors.primary, fontWeight: '700', fontSize: 14 },

  latestTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  latestDay: { ...font.label },
  latestDate: { ...font.h3, marginTop: 10 },
  latestTime: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.6, marginTop: 2 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  reason: { ...font.muted, fontSize: 15 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  noteText: { flex: 1, fontSize: 14, fontWeight: '600' },
});
