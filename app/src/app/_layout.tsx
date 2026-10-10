import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { FeedbackProvider } from '../context/FeedbackContext';
import { RequestsProvider } from '../context/RequestsContext';
import { configureNotifications } from '../lib/notifications';
import { colors } from '../theme';

configureNotifications();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RequestsProvider>
          <FeedbackProvider>
            <StatusBar style="dark" />
            <RootNavigator />
          </FeedbackProvider>
        </RequestsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  if (status === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      {signedIn ? <NotificationTapHandler /> : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
          <Stack.Screen name="request/new" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          <Stack.Screen name="request/[id]/index" />
          <Stack.Screen
            name="request/[id]/suggest"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="request/[id]/reject"
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ animation: 'fade' }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

/** Tapping any notification opens the relevant request (works from background and cold start). */
function NotificationTapHandler() {
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response) return;
    const id = response.notification.request.identifier;
    if (handled.current === id) return;
    handled.current = id;
    const requestId = response.notification.request.content.data?.requestId;
    if (typeof requestId === 'string') {
      // Let the navigator mount first on cold start.
      setTimeout(() => router.push(`/request/${requestId}`), 50);
    }
    Notifications.clearLastNotificationResponse();
  }, [response]);

  return null;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
