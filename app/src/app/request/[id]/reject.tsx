import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { Button } from '../../../components/Button';
import { WakingNote } from '../../../components/ConnectionBanner';
import { EmptyState } from '../../../components/EmptyState';
import { InlineError } from '../../../components/InlineError';
import { ScreenHeader } from '../../../components/ScreenHeader';
import { useCurrentUser } from '../../../context/AuthContext';
import { useFeedback } from '../../../context/FeedbackContext';
import { useRequests } from '../../../context/RequestsContext';
import { errorMessage } from '../../../lib/api';
import { formatDateLong, formatRange } from '../../../lib/time';
import { colors, font, radius } from '../../../theme';

export default function RejectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useCurrentUser();
  const { getById, reject } = useRequests();
  const { celebrate } = useFeedback();
  const request = getById(id);

  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user.role !== 'APPROVER') return <Redirect href="/" />;

  // Keep the form on screen while the successful submit navigates back.
  if (!request || (request.status !== 'PENDING' && !submitting)) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Reject Request" kind="close" />
        <EmptyState
          icon="checkmark-done"
          title={request ? 'Already answered' : 'Request not found'}
          subtitle={request ? 'This request is no longer waiting for a decision.' : undefined}
        />
      </SafeAreaView>
    );
  }

  const missing = !reason.trim();

  const submit = async () => {
    setTouched(true);
    if (missing || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await reject(request.id, reason.trim());
      celebrate({
        title: 'Request rejected',
        subtitle: `${request.requesterName} has been notified.`,
        color: colors.error,
      });
      router.back();
    } catch (err) {
      setError(errorMessage(err, "Couldn't reject the request."));
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScreenHeader title="Reject Request" kind="close" disabled={submitting} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.icon}>
            <Ionicons name="close-circle" size={30} color={colors.error} />
          </View>
          <Text style={styles.title}>Reject this request?</Text>
          <Text style={styles.subtitle}>
            {request.requesterName} asked for {formatDateLong(request.requestedDate)},{' '}
            {formatRange(request.requestedStartTime, request.requestedEndTime)}.
          </Text>

          <View>
            <Text style={styles.label}>Reason for rejection</Text>
            <Text style={styles.hint}>Please provide a reason. {request.requesterName} will see it.</Text>
            <TextInput
              style={[styles.input, touched && missing && styles.inputError]}
              value={reason}
              onChangeText={setReason}
              placeholder="Why can't the car be used?"
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={300}
              autoFocus
              editable={!submitting}
              textAlignVertical="top"
            />
            {touched && missing ? <Text style={styles.fieldError}>A reason is required.</Text> : null}
          </View>

          <InlineError message={error} />
        </ScrollView>

        <View style={styles.footer}>
          <Button
            title="Reject Request"
            icon="close-circle"
            variant="dangerSolid"
            onPress={submit}
            loading={submitting}
            loadingTitle="Rejecting…"
          />
          <WakingNote active={submitting} />
          <Button title="Cancel" variant="ghost" size="md" onPress={() => router.back()} disabled={submitting} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...font.h2, fontSize: 24, marginTop: -4 },
  subtitle: { ...font.muted, fontSize: 15, marginTop: -8, lineHeight: 21 },
  label: { fontSize: 14, fontWeight: '700', color: colors.text },
  hint: { ...font.muted, fontSize: 13, marginTop: 2, marginBottom: 8 },
  input: {
    minHeight: 120,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: 14,
    fontSize: 16,
    color: colors.text,
  },
  inputError: { borderColor: colors.error },
  fieldError: { color: colors.error, fontSize: 13, fontWeight: '600', marginTop: 6 },
  footer: { padding: 20, paddingTop: 8, gap: 6 },
});
