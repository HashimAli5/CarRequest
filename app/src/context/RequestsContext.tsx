import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { api, NewRequestInput } from '../lib/api';
import { API_URL } from '../lib/config';
import {
  NotificationData,
  notificationForChange,
  setAppBadge,
  showLocalNotification,
} from '../lib/notifications';
import { isPastDate } from '../lib/time';
import type { CarRequest } from '../lib/types';
import { useAuth } from './AuthContext';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type RequestsContextValue = {
  requests: CarRequest[];
  loadState: LoadState;
  /** Realtime socket connected to the server. */
  live: boolean;
  /** Requests that need the current user to act (pending for approver, suggestions for requester). */
  actionCount: number;
  refresh: () => Promise<void>;
  getById: (id: string) => CarRequest | undefined;
  /** Fetch one request from the server (e.g. opened from a notification before the list loaded). */
  fetchOne: (id: string) => Promise<CarRequest>;

  create: (input: NewRequestInput) => Promise<CarRequest>;
  approve: (id: string) => Promise<CarRequest>;
  reject: (id: string, reason: string) => Promise<CarRequest>;
  propose: (id: string, startTime: string, endTime: string) => Promise<CarRequest>;
  acceptAlternative: (id: string) => Promise<CarRequest>;
  declineAlternative: (id: string) => Promise<CarRequest>;
};

const RequestsContext = createContext<RequestsContextValue | null>(null);

const byNewest = (a: CarRequest, b: CarRequest) => b.createdAt.localeCompare(a.createdAt);

export function RequestsProvider({ children }: { children: React.ReactNode }) {
  const { status, token, user, hasRemotePush } = useAuth();
  const [requests, setRequests] = useState<CarRequest[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [live, setLive] = useState(false);

  // Mirrors of state for use inside socket/AppState callbacks.
  const requestsRef = useRef<CarRequest[]>([]);
  const loadedOnce = useRef(false);
  const hasRemotePushRef = useRef(hasRemotePush);
  hasRemotePushRef.current = hasRemotePush;
  const roleRef = useRef(user?.role);
  roleRef.current = user?.role;

  const commit = useCallback((next: CarRequest[]) => {
    requestsRef.current = next;
    setRequests(next);
  }, []);

  /** Insert or replace a request, ignoring stale versions. */
  const upsert = useCallback(
    (incoming: CarRequest) => {
      const current = requestsRef.current;
      const existing = current.find((r) => r.id === incoming.id);
      if (existing && existing.updatedAt > incoming.updatedAt) return;
      const next = existing
        ? current.map((r) => (r.id === incoming.id ? incoming : r))
        : [incoming, ...current].sort(byNewest);
      commit(next);
    },
    [commit]
  );

  const inflight = useRef<Promise<void> | null>(null);

  const refresh = useCallback((): Promise<void> => {
    // Coalesce overlapping refreshes (reconnect + app foreground often fire together).
    if (inflight.current) return inflight.current;
    inflight.current = doRefresh().finally(() => {
      inflight.current = null;
    });
    return inflight.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doRefresh = async () => {
    if (!loadedOnce.current) setLoadState('loading');
    try {
      const { requests: fresh } = await api.listRequests();
      const before = new Map(requestsRef.current.map((r) => [r.id, r]));

      // Changes that happened while we were disconnected. With remote push the OS already
      // showed them; inside Expo Go we surface them as local notifications instead.
      if (loadedOnce.current && !hasRemotePushRef.current && roleRef.current) {
        for (const r of fresh) {
          const prev = before.get(r.id);
          if (prev && prev.updatedAt === r.updatedAt) continue;
          const n = notificationForChange(prev, r, roleRef.current);
          if (n) void showLocalNotification(n.title, n.body, { requestId: r.id });
        }
      }

      commit(fresh);
      loadedOnce.current = true;
      setLoadState('ready');
    } catch {
      // Keep showing what we have; only show the error state if we never loaded.
      setLoadState(loadedOnce.current ? 'ready' : 'error');
    }
  };

  // Reset when the user changes / signs out.
  useEffect(() => {
    if (status !== 'signedIn') {
      commit([]);
      loadedOnce.current = false;
      setLoadState('idle');
      setAppBadge(0);
    }
  }, [status, commit]);

  // Realtime connection.
  useEffect(() => {
    if (status !== 'signedIn' || !token) return;
    void refresh();

    const socket: Socket = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    let connectedBefore = false;

    socket.on('connect', () => {
      setLive(true);
      // Catch up on anything missed while disconnected.
      if (connectedBefore) void refresh();
      connectedBefore = true;
    });
    socket.on('disconnect', () => setLive(false));
    socket.on('connect_error', () => setLive(false));
    socket.on('request:updated', (r: CarRequest) => upsert(r));
    socket.on('notification', (n: { title: string; body: string; data: NotificationData }) => {
      // Remote push already delivers this when available; otherwise show it locally.
      if (!hasRemotePushRef.current) void showLocalNotification(n.title, n.body, n.data);
    });

    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        if (!socket.connected) socket.connect();
        void refresh();
      }
    });

    return () => {
      sub.remove();
      socket.removeAllListeners();
      socket.disconnect();
      setLive(false);
    };
  }, [status, token, refresh, upsert]);

  const actionCount = useMemo(() => {
    if (!user) return 0;
    const target = user.role === 'APPROVER' ? 'PENDING' : 'ALTERNATIVE_PROPOSED';
    return requests.filter((r) => r.status === target && !isPastDate(r.requestedDate)).length;
  }, [requests, user]);

  useEffect(() => {
    if (status === 'signedIn') setAppBadge(actionCount);
  }, [actionCount, status]);

  const getById = useCallback((id: string) => requests.find((r) => r.id === id), [requests]);

  const fetchOne = useCallback(
    async (id: string) => {
      const { request } = await api.getRequest(id);
      upsert(request);
      return request;
    },
    [upsert]
  );

  const mutate = useCallback(
    async (call: Promise<{ request: CarRequest }>) => {
      const { request } = await call;
      upsert(request);
      return request;
    },
    [upsert]
  );

  const value: RequestsContextValue = useMemo(
    () => ({
      requests,
      loadState,
      live,
      actionCount,
      refresh,
      getById,
      fetchOne,
      create: (input) => mutate(api.createRequest(input)),
      approve: (id) => mutate(api.approve(id)),
      reject: (id, reason) => mutate(api.reject(id, reason)),
      propose: (id, s, e) => mutate(api.propose(id, s, e)),
      acceptAlternative: (id) => mutate(api.acceptAlternative(id)),
      declineAlternative: (id) => mutate(api.declineAlternative(id)),
    }),
    [requests, loadState, live, actionCount, refresh, getById, fetchOne, mutate]
  );

  return <RequestsContext.Provider value={value}>{children}</RequestsContext.Provider>;
}

export function useRequests() {
  const ctx = useContext(RequestsContext);
  if (!ctx) throw new Error('useRequests must be used inside RequestsProvider');
  return ctx;
}
