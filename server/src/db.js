import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

/**
 * libSQL client: a hosted Turso database when TURSO_DATABASE_URL is set (production),
 * otherwise a local SQLite file (development). Same SQL either way.
 */
const client = createClient(
  config.tursoUrl
    ? { url: config.tursoUrl, authToken: config.tursoAuthToken }
    : { url: `file:${config.dbPath.replace(/\\/g, '/')}` }
);

const toPlain = (row) => (row ? { ...row } : undefined);

export const db = {
  /** First row or undefined. */
  async get(sql, ...args) {
    const rs = await client.execute({ sql, args });
    return toPlain(rs.rows[0]);
  },
  async all(sql, ...args) {
    const rs = await client.execute({ sql, args });
    return rs.rows.map(toPlain);
  },
  /** Returns { changes } like the old synchronous driver. */
  async run(sql, ...args) {
    const rs = await client.execute({ sql, args });
    return { changes: rs.rowsAffected };
  },
};

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    role          TEXT NOT NULL UNIQUE CHECK (role IN ('REQUESTER', 'APPROVER')),
    username      TEXT NOT NULL UNIQUE,
    display_name  TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS push_tokens (
    token      TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform   TEXT,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS requests (
    id                       TEXT PRIMARY KEY,
    client_request_id        TEXT UNIQUE,
    requester_id             INTEGER NOT NULL REFERENCES users(id),
    approver_id              INTEGER NOT NULL REFERENCES users(id),

    requested_date           TEXT NOT NULL,  -- YYYY-MM-DD (never modified)
    requested_start_time     TEXT NOT NULL,  -- HH:MM (never modified)
    requested_end_time       TEXT NOT NULL,  -- HH:MM (never modified)

    reason                   TEXT,
    custom_reason            TEXT,

    status                   TEXT NOT NULL CHECK (status IN
                               ('PENDING', 'APPROVED', 'REJECTED', 'ALTERNATIVE_PROPOSED', 'DECLINED')),

    rejection_reason         TEXT,

    alternative_start_time   TEXT,
    alternative_end_time     TEXT,
    alternative_proposed_at  TEXT,
    alternative_responded_at TEXT,

    final_start_time         TEXT,
    final_end_time           TEXT,

    created_at               TEXT NOT NULL,
    updated_at               TEXT NOT NULL,
    decision_at              TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_requests_requester ON requests(requester_id, created_at);
  CREATE INDEX IF NOT EXISTS idx_requests_approver ON requests(approver_id, created_at);
`;

export async function initDb() {
  await client.executeMultiple(SCHEMA);
  await seedUsers();
}

/** Create / sync the two predefined accounts from config (env vars). No public sign-up exists. */
async function seedUsers() {
  const now = new Date().toISOString();
  for (const u of config.users) {
    const existing = await db.get('SELECT * FROM users WHERE role = ?', u.role);
    if (!existing) {
      await db.run(
        'INSERT INTO users (role, username, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
        u.role,
        u.username,
        u.displayName,
        bcrypt.hashSync(u.password, 10),
        now
      );
      continue;
    }
    if (existing.username !== u.username || existing.display_name !== u.displayName) {
      await db.run(
        'UPDATE users SET username = ?, display_name = ? WHERE id = ?',
        u.username,
        u.displayName,
        existing.id
      );
    }
    if (!bcrypt.compareSync(u.password, existing.password_hash)) {
      await db.run('UPDATE users SET password_hash = ? WHERE id = ?', bcrypt.hashSync(u.password, 10), existing.id);
    }
  }
  await refreshUserCache();
}

// The two users almost never change, so keep them in memory (saves a DB round trip per call).
let usersById = new Map();
async function refreshUserCache() {
  const rows = await db.all('SELECT * FROM users');
  usersById = new Map(rows.map((r) => [Number(r.id), r]));
}

export function getUserById(id) {
  return usersById.get(Number(id));
}

export function getUserByRole(role) {
  return [...usersById.values()].find((u) => u.role === role);
}

export async function getUserByUsername(username) {
  return db.get('SELECT * FROM users WHERE username = ?', username);
}

export function publicUser(row) {
  if (!row) return row;
  // Include the other person's name so the app can say "Ask Kiran" instead of a generic label.
  const partner = getUserByRole(row.role === 'REQUESTER' ? 'APPROVER' : 'REQUESTER');
  return {
    id: Number(row.id),
    username: row.username,
    name: row.display_name,
    role: row.role,
    partnerName: partner?.display_name ?? null,
  };
}
