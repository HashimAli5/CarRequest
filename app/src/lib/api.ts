import { API_URL } from './config';
import type { CarRequest, User } from './types';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

/** The server could not be reached at all (offline, wrong network, server down). */
export class NetworkError extends Error {
  constructor() {
    super('No internet connection.');
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

// The free server sleeps when idle and takes up to ~a minute to wake, so allow for that and
// tell the UI when a call is slow so it can say "Waking up the server…".
const TIMEOUT_MS = 75_000;
const SLOW_AFTER_MS = 4_000;
let slowCalls = 0;
const slowListeners = new Set<(slow: boolean) => void>();

export function subscribeSlowServer(listener: (slow: boolean) => void) {
  slowListeners.add(listener);
  return () => {
    slowListeners.delete(listener);
  };
}

function setSlow(delta: 1 | -1) {
  const before = slowCalls > 0;
  slowCalls += delta;
  const after = slowCalls > 0;
  if (before !== after) slowListeners.forEach((l) => l(after));
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let markedSlow = false;
  const slowTimer = setTimeout(() => {
    markedSlow = true;
    setSlow(1);
  }, SLOW_AFTER_MS);
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
    clearTimeout(slowTimer);
    if (markedSlow) setSlow(-1);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorized?.();
    throw new ApiError(
      res.status,
      json?.error?.code ?? 'UNKNOWN',
      json?.error?.message ?? 'Something went wrong.'
    );
  }
  return json as T;
}

export type NewRequestInput = {
  clientRequestId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason: string | null;
  customReason: string | null;
};

export const api = {
  login: (username: string, password: string) =>
    request<{ token: string; user: User }>('POST', '/auth/login', { username, password }),
  me: () => request<{ user: User }>('GET', '/me'),
  registerPushToken: (token: string, platform: string) =>
    request('POST', '/push-tokens', { token, platform }),
  unregisterPushToken: (token: string) => request('DELETE', '/push-tokens', { token }),

  listRequests: () => request<{ requests: CarRequest[] }>('GET', '/requests'),
  getRequest: (id: string) => request<{ request: CarRequest }>('GET', `/requests/${id}`),
  createRequest: (input: NewRequestInput) =>
    request<{ request: CarRequest }>('POST', '/requests', input),

  approve: (id: string) => request<{ request: CarRequest }>('POST', `/requests/${id}/approve`),
  reject: (id: string, reason: string) =>
    request<{ request: CarRequest }>('POST', `/requests/${id}/reject`, { reason }),
  propose: (id: string, startTime: string, endTime: string) =>
    request<{ request: CarRequest }>('POST', `/requests/${id}/propose`, { startTime, endTime }),
  acceptAlternative: (id: string) =>
    request<{ request: CarRequest }>('POST', `/requests/${id}/accept`),
  declineAlternative: (id: string) =>
    request<{ request: CarRequest }>('POST', `/requests/${id}/decline`),
};

/**
 * Human message for a failed call. Server validation messages (4xx) are shown as-is;
 * otherwise fall back to the screen-specific copy.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof NetworkError) return `${fallback}\nPlease check your connection and try again.`;
  if (err instanceof ApiError && err.status >= 400 && err.status < 500) return err.message;
  return `${fallback}\nPlease try again.`;
}
