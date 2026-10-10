import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useRequests } from '../context/RequestsContext';
import { formatRange } from '../lib/time';
import type { CarRequest } from '../lib/types';
import { useConfirmAction } from '../lib/useConfirmAction';
import { colors } from '../theme';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

/** Requester's Accept / Decline for an ALTERNATIVE_PROPOSED request. */
export function AlternativeResponse({ request }: { request: CarRequest }) {
  const { acceptAlternative, declineAlternative } = useRequests();
  const accept = useConfirmAction();
  const decline = useConfirmAction();
  const alt = formatRange(request.alternativeStartTime!, request.alternativeEndTime!);
  const busy = accept.loading || decline.loading;

  return (
    <View style={styles.wrap}>
      <Button title={`Accept ${alt}`} icon="checkmark-circle" variant="success" onPress={accept.open} disabled={busy} />
      <Button title="Decline" icon="close" variant="secondary" size="md" onPress={decline.open} disabled={busy} />

      <ConfirmDialog
        visible={accept.visible}
        tone="success"
        icon="car-sport"
        title={`Use the car from ${alt}?`}
        message={`${request.approverName} will be notified that you accepted.`}
        confirmLabel="Accept Time"
        loadingLabel="Accepting…"
        loading={accept.loading}
        error={accept.error}
        onConfirm={() =>
          accept.run(() => acceptAlternative(request.id), {
            success: "It's a deal!",
            successSubtitle: `The car is yours from ${alt}.`,
            failure: "Couldn't accept the suggested time.",
          })
        }
        onCancel={accept.close}
      />

      <ConfirmDialog
        visible={decline.visible}
        tone="danger"
        icon="remove-circle"
        title="Decline this time?"
        message="You can decline the suggested time if it doesn't work for you."
        confirmLabel="Decline"
        loadingLabel="Declining…"
        loading={decline.loading}
        error={decline.error}
        onConfirm={() =>
          decline.run(() => declineAlternative(request.id), {
            success: 'Suggestion declined',
            successSubtitle: `${request.approverName} has been notified.`,
            successColor: colors.neutral,
            failure: "Couldn't decline the suggested time.",
          })
        }
        onCancel={decline.close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
});
