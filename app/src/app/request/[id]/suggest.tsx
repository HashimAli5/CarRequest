import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../components/Button';
import { DateTimeField } from '../../../components/DateTimeField';
import { WakingNote } from '../../../components/ConnectionBanner';
import { EmptyState } from '../../../components/EmptyState';
import { FadeIn } from '../../../components/FadeIn';
import { InlineError } from '../../../components/InlineError';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useCurrentUser } from '../../../context/AuthContext';
import { useFeedback } from '../../../context/FeedbackContext';
import { useRequests } from '../../../context/RequestsContext';
import { errorMessage } from '../../../lib/api';
import { formatDateLong, formatMonthDay, formatRange, formatTime, hhmmToDate, toHHMM, toMinutes } from '../../../lib/time';
import { colors, font, radius } from '../../../theme';

export default function SuggestTimeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const { getById, propose } = useRequests();
  const { celebrate } = useFeedback();
  const request = getById(id);

  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user.role !== 'APPROVER') return <Redirect href="/" />;

  // Keep the form on screen while the successful submit navigates back.
  if (!request || (request.status !== 'PENDING' && !submitting)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Suggest a Time" kind="close" />
        <EmptyState
          icon="checkmark-done"
          title={request ? 'Already answered' : 'Request not found'}
          subtitle={request ? 'This request is no longer waiting for a decision.' : undefined}
        />
      </SafeAreaView>
    );
  }

  const submit = async () => {
    if (submitting) return;
    if (!start || !end) return setFieldError('Pick both times.');
    if (toMinutes(end) <= toMinutes(start)) return setFieldError('"Available until" must be after "available from".');
    if (start === request.requestedStartTime && end === request.requestedEndTime) {
      return setFieldError("That's exactly the requested time — use Approve instead.");
    }
    setFieldError(null);
    setError(null);
    setSubmitting(true);
    try {
      await propose(request.id, start, end);
      celebrate({
        title: 'Time suggested',
        subtitle: `${request.requesterName} has been notified.`,
        color: colors.alternative,
      });
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Couldn't suggest the new time."));
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Suggest a Time" kind="close" disabled={submitting} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>When is the car available?</Text>

        <View style={styles.original}>
          <Text style={styles.originalLabel}>Requested</Text>
          <Text style={styles.originalDate}>{formatDateLong(request.requestedDate)}</Text>
          <Text style={styles.originalTime}>{formatRange(request.requestedStartTime, request.requestedEndTime)}</Text>
        </View>

        <View style={styles.dateLock}>
          <Ionicons name="lock-closed" size={14} color={colors.textMuted} />
          <Text style={styles.dateLockText}>Same day: {formatMonthDay(request.requestedDate)}</Text>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <DateTimeField
              mode="time"
              label="Available From"
              value={start ? hhmmToDate(start) : hhmmToDate(request.requestedStartTime)}
              display={start ? formatTime(start) : null}
              placeholder="From"
              onChange={(d) => {
                setStart(toHHMM(d));
                setFieldError(null);
              }}
              disabled={submitting}
            />
          </View>
          <View style={{ flex: 1 }}>
            <DateTimeField
              mode="time"
              label="Available Until"
              value={end ? hhmmToDate(end) : hhmmToDate(request.requestedEndTime)}
              display={end ? formatTime(end) : null}
              placeholder="Until"
              onChange={(d) => {
                setEnd(toHHMM(d));
                setFieldError(null);
              }}
              disabled={submitting}
            />
          </View>
        </View>

        {fieldError ? <InlineError message={fieldError} /> : null}

        {start && end && toMinutes(end) > toMinutes(start) ? (
          <FadeIn>
            <View style={styles.preview}>
              <Ionicons name="swap-horizontal" size={20} color={colors.alternative} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewLabel}>Available</Text>
                <Text style={styles.previewTime}>{formatRange(start, end)}</Text>
              </View>
            </View>
          </FadeIn>
        ) : null}

        <InlineError message={error} />
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Suggest This Time"
          icon="send"
          variant="alternativeSolid"
          onPress={submit}
          loading={submitting}
          loadingTitle="Suggesting time…"
        />
        <WakingNote active={submitting} />
        <Button title="Cancel" variant="ghost" size="md" onPress={() => router.back()} disabled={submitting} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  title: { ...font.h2, fontSize: 24 },
  original: { backgroundColor: colors.neutralSoft, borderRadius: radius.lg, padding: 16 },
  originalLabel: { ...font.label },
  originalDate: { ...font.h3, marginTop: 6 },
  originalTime: { fontSize: 22, fontWeight: '800', color: colors.textMuted, marginTop: 2 },
  dateLock: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: -4 },
  dateLockText: { ...font.muted, fontSize: 13, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 12 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.alternativeSoft,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.alternative + '40',
  },
  previewLabel: { ...font.label, color: colors.alternative },
  previewTime: { fontSize: 22, fontWeight: '800', color: colors.alternative, marginTop: 2 },
  footer: { padding: 20, paddingTop: 8, gap: 6 },
});
