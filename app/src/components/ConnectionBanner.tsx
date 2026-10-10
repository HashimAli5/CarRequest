import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNetInfo } from '@react-native-community/netinfo';
import { useRequests } from '../context/RequestsContext';
import { subscribeSlowServer } from '../lib/api';
import { colors, radius } from '../theme';
import { FadeIn } from './FadeIn';

/** True while any API call has been waiting several seconds (free server waking up). */
export function useServerWaking() {
  const [waking, setWaking] = useState(false);
  useEffect(() => subscribeSlowServer(setWaking), []);
  return waking;
}

/** Small inline hint shown under buttons while a call is waiting on a sleeping server. */
export function WakingNote({ active }: { active: boolean }) {
  const waking = useServerWaking();
  if (!active || !waking) return null;
  return (
    <FadeIn from={-4}>
      <Text style={styles.note}>Waking up the server… this can take up to a minute.</Text>
    </FadeIn>
  );
}

/** Shows when the phone is offline, the server can't be reached, or it's waking up. */
export function ConnectionBanner() {
  const net = useNetInfo();
  const waking = useServerWaking();
  const { live, loadState } = useRequests();
  const offline = net.isConnected === false;
  // Give the socket a moment on startup before complaining.
  const serverDown = !offline && !live && (loadState === 'ready' || loadState === 'error');

  if (!offline && !serverDown && !waking) return null;
  return (
    <FadeIn from={-6} style={styles.banner}>
      <Ionicons name={offline ? 'cloud-offline' : 'sync'} size={16} color={colors.pending} />
      <View style={{ flex: 1 }}>
        <Text style={styles.text}>
          {offline
            ? "You're offline. Changes will sync when you reconnect."
            : waking
              ? 'Waking up the server… this can take up to a minute.'
              : 'Reconnecting to the server…'}
        </Text>
      </View>
    </FadeIn>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.pendingSoft,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  text: { color: colors.pending, fontSize: 13, fontWeight: '600' },
  note: { color: colors.pending, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 4 },
});
