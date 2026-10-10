import Constants from 'expo-constants';

const API_PORT = 4000;

/**
 * Where the backend lives.
 * - EXPO_PUBLIC_API_URL wins if set (e.g. when the server moves to the cloud).
 * - Otherwise reuse the LAN host the phone already used to load the JS bundle from
 *   `npx expo start` (e.g. 192.168.1.20:8081 -> http://192.168.1.20:4000).
 */
function resolveApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const host = hostUri.split(':')[0];
  if (host) return `http://${host}:${API_PORT}`;

  return `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

/** True when running inside the Expo Go app (remote push is not available there). */
export const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';
