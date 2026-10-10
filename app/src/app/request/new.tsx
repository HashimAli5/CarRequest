import React, { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { Redirect, router } from 'expo-router';
import { Button } from '../../components/Button';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { DateTimeField } from '../../components/DateTimeField';
import { fieldStyles } from '../../components/FieldShell';
import { InlineError } from '../../components/InlineError';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SelectField } from '../../components/SelectField';
import { SuccessCheck } from '../../components/SuccessCheck';
import { FadeIn } from '../../components/FadeIn';
import { useCurrentUser } from '../../context/AuthContext';
import { useRequests } from '../../context/RequestsContext';
import { ApiError, NetworkError } from '../../lib/api';
import { formatDateLong, formatRange, formatTime, toHHMM, toMinutes, toYmd } from '../../lib/time';
import { REASONS } from '../../lib/types';
import { colors, font, radius } from '../../theme';

type Errors = Partial<Record<'date' | 'start' | 'end' | 'custom', string>>;

const START_GRACE_MINUTES = 15;

function newClientId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function NewRequestScreen() {
  const user = useCurrentUser();
  const { create } = useRequests();

  const [date, setDate] = useState<string | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');
  const [errors, setErrors] = useState<Errors>({});

  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Idempotency key: identical retries (e.g. after a dropped connection) can never create a
  // second request. It changes whenever the request content changes.
  const clientRequestId = useMemo(
    () => newClientId(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [date, start, end, reason, customReason]
  );

  if (user.role !== 'REQUESTER') return <Redirect href="/" />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const validate = (): boolean => {
    const e: Errors = {};
    if (!date) e.date = 'Please pick a date.';
    else if (date < toYmd(new Date())) e.date = "You can't pick a date in the past.";
    if (!start) e.start = 'Please pick a start time.';
    if (!end) e.end = 'Please pick an end time.';
    if (start && end && toMinutes(end) <= toMinutes(start)) e.end = 'End time must be after the start time.';
    if (date === toYmd(new Date()) && start) {
      const now = new Date();
      if (toMinutes(start) < now.getHours() * 60 + now.getMinutes() - START_GRACE_MINUTES) {
        e.start = 'That time has already passed today.';
      }
    }
    if (reason === 'Other' && !customReason.trim()) e.custom = 'Please tell us why.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const shownReason = reason === 'Other' ? customReason.trim() : reason;

  const send = async () => {
    if (sending || !date || !start || !end) return;
    setSending(true);
    setSendError(null);
    try {
      const net = await NetInfo.fetch();
      if (net.isConnected === false) {
        setSendError("No internet connection. Your request couldn't be sent.");
        return;
      }
      await create({
        clientRequestId,
        date,
        startTime: start,
        endTime: end,
        reason,
        customReason: reason === 'Other' ? customReason.trim() : null,
      });
      setConfirming(false);
      setSent(true);
    } catch (err) {
      if (err instanceof NetworkError) {
        setSendError("Couldn't send the request.\nPlease check your connection and try again.");
      } else if (err instanceof ApiError && err.status < 500) {
        setSendError(err.message);
      } else {
        setSendError("Couldn't send the request.\nPlease try again.");
      }
    } finally {
      setSending(false);
    }
  };

  if (sent && date && start && end) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.success}>
          <SuccessCheck color={colors.primary} icon="paper-plane" />
          <FadeIn delay={150} style={{ alignItems: 'center' }}>
            <Text style={styles.successTitle}>Request sent!</Text>
            <Text style={styles.successText}>{user.partnerName ?? 'Your brother'} has been notified.</Text>
            <View style={styles.successSummary}>
              <Text style={styles.summaryDate}>{formatDateLong(date)}</Text>
              <Text style={styles.summaryTime}>{formatRange(start, end)}</Text>
            </View>
          </FadeIn>
        </View>
        <View style={styles.footer}>
          <Button title="Done" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Request the Car" kind="close" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={styles.intro}>When do you need it?</Text>

          <DateTimeField
            mode="date"
            label="Date"
            value={date ? new Date(`${date}T12:00:00`) : null}
            display={date ? formatDateLong(date) : null}
            placeholder="Pick a day"
            minimumDate={today}
            onChange={(d) => {
              setDate(toYmd(d));
              setErrors((e) => ({ ...e, date: undefined }));
            }}
            error={errors.date}
          />

          <View style={styles.timeRow}>
            <View style={{ flex: 1 }}>
              <DateTimeField
                mode="time"
                label="Start Time"
                value={start ? timeToDate(start) : null}
                display={start ? formatTime(start) : null}
                placeholder="From"
                onChange={(d) => {
                  setStart(toHHMM(d));
                  setErrors((e) => ({ ...e, start: undefined, end: undefined }));
                }}
                error={errors.start}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DateTimeField
                mode="time"
                label="End Time"
                value={end ? timeToDate(end) : start ? timeToDate(addHours(start, 3)) : null}
                display={end ? formatTime(end) : null}
                placeholder="Until"
                onChange={(d) => {
                  setEnd(toHHMM(d));
                  setErrors((e) => ({ ...e, end: undefined }));
                }}
                error={errors.end}
              />
            </View>
          </View>

          <SelectField
            label="Reason (optional)"
            value={reason}
            options={REASONS}
            placeholder="Why do you need it?"
            noneLabel="No reason"
            onChange={(v) => {
              setReason(v);
              setErrors((e) => ({ ...e, custom: undefined }));
            }}
          />

          {reason === 'Other' ? (
            <FadeIn>
              <Text style={fieldStyles.label}>Tell us why</Text>
              <TextInput
                style={[styles.input, errors.custom && { borderColor: colors.error }]}
                value={customReason}
                onChangeText={(t) => {
                  setCustomReason(t);
                  setErrors((e) => ({ ...e, custom: undefined }));
                }}
                placeholder="e.g. Picking up a friend from the airport"
                placeholderTextColor={colors.textFaint}
                maxLength={200}
                autoFocus
              />
              {errors.custom ? <Text style={styles.fieldError}>{errors.custom}</Text> : null}
            </FadeIn>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Continue"
            icon="arrow-forward"
            onPress={() => {
              if (validate()) {
                setSendError(null);
                setConfirming(true);
              }
            }}
          />
        </View>
      </KeyboardAvoidingView>

      <ConfirmDialog
        visible={confirming}
        icon="car-sport"
        title="Ready to send?"
        confirmLabel="Send Request"
        loadingLabel="Sending request…"
        loading={sending}
        error={sendError}
        onConfirm={send}
        onCancel={() => setConfirming(false)}
      >
        {date && start && end ? (
          <View style={styles.summary}>
            <Text style={styles.summaryLabel}>You're requesting the car on</Text>
            <Text style={styles.summaryDate}>{formatDateLong(date)}</Text>
            <Text style={styles.summaryTime}>{formatRange(start, end)}</Text>
            {shownReason ? (
              <>
                <Text style={[styles.summaryLabel, { marginTop: 10 }]}>Reason</Text>
                <Text style={styles.summaryReason}>{shownReason}</Text>
              </>
            ) : null}
          </View>
        ) : null}
      </ConfirmDialog>
    </SafeAreaView>
  );
}

function timeToDate(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function addHours(hhmm: string, hours: number) {
  const total = Math.min(toMinutes(hhmm) + hours * 60, 23 * 60 + 55);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 18, paddingBottom: 24 },
  intro: { ...font.h2 },
  timeRow: { flexDirection: 'row', gap: 12 },
  input: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.text,
  },
  fieldError: { color: colors.error, fontSize: 13, fontWeight: '600', marginTop: 6 },
  footer: { padding: 20, paddingTop: 8 },

  summary: { marginTop: 16, backgroundColor: colors.primarySoft, borderRadius: radius.md, padding: 16 },
  summaryLabel: { ...font.label, fontSize: 11, textAlign: 'center' },
  summaryDate: { ...font.h3, marginTop: 4, textAlign: 'center' },
  summaryTime: { fontSize: 22, fontWeight: '800', color: colors.primary, marginTop: 2, textAlign: 'center' },
  summaryReason: { ...font.body, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  success: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  successTitle: { ...font.title, marginTop: 4 },
  successText: { ...font.muted, fontSize: 16, marginTop: 6 },
  successSummary: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
