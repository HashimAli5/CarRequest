import React, { useEffect, useRef, useState } from 'react';
import { Animated, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ApproverActions } from '../components/ApproverActions';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { EmptyState } from '../components/EmptyState';
import { FadeIn } from '../components/FadeIn';
import { InlineError } from '../components/InlineError';
import { RequestCard } from '../components/RequestCard';
import { useCurrentUser } from '../context/AuthContext';
import { useRequests } from '../context/RequestsContext';
import { formatDateLong, formatRange, friendlyDay, isPastDate, timeAgo } from '../lib/time';
import { CarRequest, displayReason } from '../lib/types';
import { colors, font, radius } from '../theme';
import { HomeHeader, LoadingRow, SectionTitle } from './HomeHeader';

export function ApproverHome() {
  const { requests, loadState, refresh } = useRequests();
  const [refreshing, setRefreshing] = useState(false);

  // Oldest first: answer requests in the order they arrived.
  const pending = requests.filter((r) => r.status === 'PENDING').reverse();
  const waiting = requests.filter((r) => r.status === 'ALTERNATIVE_PROPOSED');
  const requesterName = useCurrentUser().partnerName ?? requests[0]?.requesterName ?? 'your brother';

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const loading = loadState === 'loading' || loadState === 'idle';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <HomeHeader />
        <ConnectionBanner />

        <View style={styles.titleRow}>
          <Text style={styles.title}>Car Requests</Text>
          {pending.length > 0 ? <CountPill count={pending.length} /> : null}
        </View>
        {!loading && loadState !== 'error' ? (
          <Text style={styles.subtitle}>
            {pending.length === 0
              ? 'Nothing needs your attention.'
              : pending.length === 1
                ? '1 request needs your attention.'
                : `${pending.length} requests need your attention.`}
          </Text>
        ) : null}

        <View style={styles.list}>
          {loading ? (
            <LoadingRow text="Loading requests…" />
          ) : loadState === 'error' ? (
            <View style={{ gap: 12 }}>
              <InlineError message="Couldn't load requests. Please check your connection." />
              <Button title="Try Again" variant="secondary" icon="refresh" onPress={() => void refresh()} />
            </View>
          ) : pending.length === 0 ? (
            <Card>
              <EmptyState
                icon="checkmark-done"
                tint={colors.success}
                title="No pending requests"
                subtitle="You're all caught up."
              />
            </Card>
          ) : (
            pending.map((r, i) => (
              <FadeIn key={r.id} delay={i * 60}>
                <PendingCard request={r} />
              </FadeIn>
            ))
          )}
        </View>

        {waiting.length > 0 ? (
          <>
            <SectionTitle>Waiting for {requesterName}</SectionTitle>
            <Text style={[styles.subtitle, { marginTop: -6, marginBottom: 12 }]}>
              You suggested another time. {requesterName} hasn't responded yet.
            </Text>
            <View style={styles.list}>
              {waiting.map((r) => (
                <RequestCard key={r.id} request={r} role="APPROVER" />
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PendingCard({ request: r }: { request: CarRequest }) {
  const reason = displayReason(r);
  const past = isPastDate(r.requestedDate);
  return (
    <Card>
      <View style={styles.cardHead}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{r.requesterName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{r.requesterName} wants the car</Text>
          <Text style={styles.cardSent}>Sent {timeAgo(r.createdAt)}</Text>
        </View>
      </View>

      <View style={styles.when}>
        <Text style={styles.whenDay}>
          {friendlyDay(r.requestedDate) === formatDateLong(r.requestedDate)
            ? formatDateLong(r.requestedDate)
            : `${friendlyDay(r.requestedDate)} · ${formatDateLong(r.requestedDate)}`}
        </Text>
        <Text style={styles.whenTime}>{formatRange(r.requestedStartTime, r.requestedEndTime)}</Text>
      </View>

      <Text style={styles.reasonLabel}>Reason</Text>
      <Text style={[styles.reason, !reason && { color: colors.textFaint }]}>{reason ?? 'No reason given'}</Text>

      <View style={{ marginTop: 16 }}>
        {past ? (
          <InlineError message="This date has already passed." />
        ) : (
          <ApproverActions request={r} />
        )}
      </View>
    </Card>
  );
}

/** Count pill that pops when the number changes. */
function CountPill({ count }: { count: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    scale.setValue(1.35);
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 12 }).start();
  }, [count, scale]);
  return (
    <Animated.View style={[styles.pill, { transform: [{ scale }] }]} accessibilityLabel={`${count} pending`}>
      <Ionicons name="notifications" size={13} color={colors.white} />
      <Text style={styles.pillText}>{count}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 40 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { ...font.h2, fontSize: 22 },
  subtitle: { ...font.muted, fontSize: 15, marginTop: 4 },
  list: { gap: 14, marginTop: 14 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.error,
    borderRadius: radius.pill,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  pillText: { color: colors.white, fontWeight: '800', fontSize: 13 },

  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800', fontSize: 17 },
  cardTitle: { ...font.h3 },
  cardSent: { ...font.muted, fontSize: 13, marginTop: 1 },

  when: {
    marginTop: 14,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: 14,
  },
  whenDay: { fontSize: 14, fontWeight: '700', color: colors.primary },
  whenTime: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 2, letterSpacing: -0.5 },

  reasonLabel: { ...font.label, marginTop: 14 },
  reason: { ...font.body, marginTop: 3 },
});
