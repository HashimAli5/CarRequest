import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError, setAuthToken, setUnauthorizedHandler } from '../lib/api';
import { ensurePermission, getPushToken } from '../lib/notifications';
import type { User } from '../lib/types';

const TOKEN_KEY = 'carreq.token';
const USER_KEY = 'carreq.user';

type AuthState =
  | { status: 'loading'; user: null; token: null }
  | { status: 'signedOut'; user: null; token: null }
  | { status: 'signedIn'; user: User; token: string };

type AuthContextValue = AuthState & {
  /** True when this device has a working remote-push token (dev/production build). */
  hasRemotePush: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const SIGNED_OUT: AuthState = { status: 'signedOut', user: null, token: null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null, token: null });
  const [hasRemotePush, setHasRemotePush] = useState(false);
  const pushTokenRef = useRef<string | null>(null);

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
    await SecureStore.deleteItemAsync(USER_KEY).catch(() => undefined);
    setState(SIGNED_OUT);
  }, []);

  // 1. Restore the remembered session on startup.
  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY).catch(() => null);
      const cachedUser = await SecureStore.getItemAsync(USER_KEY).catch(() => null);
      if (!token) return setState(SIGNED_OUT);
      setAuthToken(token);
      try {
        const { user } = await api.me();
        await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
        setState({ status: 'signedIn', user, token });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return clearSession();
        // Offline / server unreachable: keep the remembered user so the app still opens.
        if (cachedUser) setState({ status: 'signedIn', user: JSON.parse(cachedUser), token });
        else setState(SIGNED_OUT);
      }
    })();
  }, [clearSession]);

  // Expired / revoked session anywhere in the app -> back to login.
  useEffect(() => {
    setUnauthorizedHandler(() => void clearSession());
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // 2. Once signed in, ask for notification permission and register for remote push if available.
  useEffect(() => {
    if (state.status !== 'signedIn') return;
    let cancelled = false;
    (async () => {
      const granted = await ensurePermission().catch(() => false);
      if (!granted || cancelled) return;
      const pushToken = await getPushToken();
      if (!pushToken || cancelled) return;
      try {
        await api.registerPushToken(pushToken, Platform.OS);
        pushTokenRef.current = pushToken;
        setHasRemotePush(true);
      } catch {
        // Will retry next launch; realtime + local notifications still work meanwhile.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  const login = useCallback(async (username: string, password: string) => {
    const { token, user } = await api.login(username.trim(), password);
    setAuthToken(token);
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    setState({ status: 'signedIn', user, token });
  }, []);

  const logout = useCallback(async () => {
    if (pushTokenRef.current) {
      await api.unregisterPushToken(pushTokenRef.current).catch(() => undefined);
      pushTokenRef.current = null;
      setHasRemotePush(false);
    }
    await clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ ...state, hasRemotePush, login, logout }),
    [state, hasRemotePush, login, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

/**
 * For screens that only render when signed in. Keeps returning the last user during the
 * brief moment after sign-out while those screens are being unmounted.
 */
export function useCurrentUser(): User {
  const { user } = useAuth();
  const last = useRef<User | null>(user);
  if (user) last.current = user;
  if (!last.current) throw new Error('No signed-in user');
  return last.current;
}
