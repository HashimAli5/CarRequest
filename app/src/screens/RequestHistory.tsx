import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { ConnectionBanner } from '../components/ConnectionBanner';
import { EmptyState } from '../components/EmptyState';
import { InlineError } from '../components/InlineError';
import { PressableScale } from '../components/PressableScale';
import { RequestCard } from '../components/RequestCard';
import { useCurrentUser } from '../context/AuthContext';
import { useRequests } from '../context/RequestsContext';
import type { RequestStatus } from '../lib/types';
import { colors, font, radius } from '../theme';
import { LoadingRow } from './HomeHeader';

type Filter = 'ALL' | RequestStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ALTERNATIVE_PROPOSED', label: 'Alternative' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'DECLINED', label: 'Declined' },
];

export function RequestHistory() {
  const user = useCurrentUser();
  const { requests, loadState, refresh } = useRequests();
  const [filter, setFilter] = useState<Filter>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const data = useMemo(
    () => (filter === 'ALL' ? requests : requests.filter((r) => r.status === filter)),
    [requests, filter]
  );
  const counts = useMemo(() => {
    const c: Partial<Record<Filter, number>> = { ALL: requests.length };
    requests.forEach((r) => (c[r.status] = (c[r.status] ?? 0) + 1));
    return c;
  }, [requests]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const loading = loadState === 'loading' || loadState === 'idle';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Requests</Text>
        <Text style={styles.subtitle}>
          {user.role === 'APPROVER' ? 'Every request, newest first.' : 'Your request history, newest first.'}
        </Text>
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((f) => {
            const active = f.key === filter;
            const n = counts[f.key] ?? 0;
            return (
              <PressableScale
                key={f.key}
                onPress={() => setFilter(f.key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                  {n > 0 ? ` · ${n}` : ''}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={loading || loadState === 'error' ? [] : data}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <RequestCard request={item} role={user.role} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListHeaderComponent={<ConnectionBanner />}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListEmptyComponent={
          loading ? (
            <LoadingRow text="Loading requests…" />
          ) : loadState === 'error' ? (
            <View style={{ gap: 12 }}>
              <InlineError message="Couldn't load requests. Please check your connection." />
              <Button title="Try Again" variant="secondary" icon="refresh" onPress={() => void refresh()} />
            </View>
          ) : filter === 'ALL' ? (
            <EmptyState
              icon="file-tray-outline"
              title="No previous requests."
              subtitle={user.role === 'REQUESTER' ? 'Need the car? Send your first request.' : undefined}
            />
          ) : (
            <EmptyState icon="filter-outline" title="Nothing here" subtitle="No requests match this filter." />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12 },
  title: { ...font.title },
  subtitle: { ...font.muted, fontSize: 15, marginTop: 2 },
  filters: { paddingHorizontal: 20, paddingVertical: 14, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    height: 38,
    justifyContent: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  chipTextActive: { color: colors.white },
  list: { paddingHorizontal: 20, paddingBottom: 40, flexGrow: 1 },
});
