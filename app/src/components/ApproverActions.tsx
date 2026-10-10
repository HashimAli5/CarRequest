import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useRequests } from '../context/RequestsContext';
import { formatMonthDay, formatRange } from '../lib/time';
import type { CarRequest } from '../lib/types';
import { useConfirmAction } from '../lib/useConfirmAction';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

/** Approve / Suggest Time / Reject for a PENDING request. */
export function ApproverActions({ request }: { request: CarRequest }) {
  const { approve } = useRequests();
  const dialog = useConfirmAction();

  return (
    <View style={styles.wrap}>
      <Button title="Approve" icon="checkmark-circle" variant="success" onPress={dialog.open} />
      <View style={styles.row}>
        <Button
          title="Suggest Time"
          icon="swap-horizontal"
          variant="alternative"
          size="md"
          style={styles.flex}
          onPress={() => router.push(`/request/${request.id}/suggest`)}
        />
        <Button
          title="Reject"
          icon="close-circle"
          variant="danger"
          size="md"
          style={styles.flex}
          onPress={() => router.push(`/request/${request.id}/reject`)}
        />
      </View>

      <ConfirmDialog
        visible={dialog.visible}
        icon="checkmark-circle"
        tone="success"
        title="Approve this request?"
        message={`${request.requesterName} will be notified that the request for ${formatMonthDay(
          request.requestedDate
        )}, ${formatRange(request.requestedStartTime, request.requestedEndTime)} was approved.`}
        confirmLabel="Approve"
        loadingLabel="Approving…"
        loading={dialog.loading}
        error={dialog.error}
        onConfirm={() =>
          dialog.run(() => approve(request.id), {
            success: 'Approved!',
            failure: "Couldn't approve the request.",
          })
        }
        onCancel={dialog.close}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
