import { db } from './db.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export async function savePushToken(userId, token, platform) {
  if (typeof token !== 'string' || !/^Expo(nent)?PushToken\[.+\]$/.test(token)) {
    return false;
  }
  // A device belongs to exactly one of the two users at a time.
  await db.run(
    `INSERT INTO push_tokens (token, user_id, platform, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform,
       updated_at = excluded.updated_at`,
    token,
    userId,
    platform ?? null,
    new Date().toISOString()
  );
  return true;
}

export async function removePushToken(userId, token) {
  await db.run('DELETE FROM push_tokens WHERE token = ? AND user_id = ?', token ?? '', userId);
}

/**
 * Send a push notification via the Expo push service (which forwards to FCM / APNs).
 * Never throws: a failed push must not fail the underlying request change,
 * which is already persisted and also delivered over the realtime socket.
 */
export async function sendPush(userId, { title, body, data }) {
  try {
    const tokens = await db.all('SELECT token FROM push_tokens WHERE user_id = ?', userId);
    if (tokens.length === 0) return;

    const messages = tokens.map(({ token }) => ({
      to: token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
      channelId: 'car-requests',
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
      signal: AbortSignal.timeout(10_000),
    });
    const json = await res.json().catch(() => null);
    const tickets = json?.data ?? [];
    for (const [i, ticket] of tickets.entries()) {
      if (ticket?.status === 'error') {
        console.warn(`[push] ${ticket.message}`);
        if (ticket.details?.error === 'DeviceNotRegistered') {
          await db.run('DELETE FROM push_tokens WHERE token = ?', messages[i].to);
        }
      }
    }
  } catch (err) {
    console.warn(`[push] failed: ${err.message}`);
  }
}
