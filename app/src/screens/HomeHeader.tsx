import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PressableScale } from '../components/PressableScale';
import { useAuth, useCurrentUser } from '../context/AuthContext';
import { greeting } from '../lib/time';
import { colors, font } from '../theme';

export function HomeHeader() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.greeting}>{greeting()},</Text>
        <Text style={styles.name} numberOfLines={1}>
          {user.name}
        </Text>
      </View>
      <PressableScale
        onPress={() => setConfirm(true)}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        hitSlop={8}
        style={styles.avatar}
      >
        <Text style={styles.initial}>{user.name.slice(0, 1).toUpperCase()}</Text>
      </PressableScale>

      <ConfirmDialog
        visible={confirm}
        icon="log-out"
        title="Sign out?"
        message={`You're signed in as ${user.name}. You won't get notifications on this phone until you sign in again.`}
        confirmLabel="Sign Out"
        loadingLabel="Signing out…"
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          setConfirm(false);
          await logout();
        }}
        onCancel={() => setConfirm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  greeting: { ...font.muted, fontSize: 16 },
  name: { ...font.title },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: colors.primary, fontSize: 18, fontWeight: '800' },
});

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={sectionStyles.row}>
      <Text style={sectionStyles.title}>{children}</Text>
      {right}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 26,
    marginBottom: 12,
  },
  title: { ...font.h2 },
});

export function LoadingRow({ text }: { text: string }) {
  return (
    <View style={loadingStyles.row}>
      <ActivityIndicator color={colors.primary} />
      <Text style={loadingStyles.text}>{text}</Text>
    </View>
  );
}

const loadingStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 32 },
  text: { ...font.muted },
});
