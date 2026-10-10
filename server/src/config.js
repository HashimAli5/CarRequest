import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const dataDir = path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });

function loadJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (process.env.NODE_ENV === 'production') {
    // Hosts like Render have no persistent disk: a generated secret would log everyone out on restart.
    throw new Error('JWT_SECRET must be set in production.');
  }
  const file = path.join(dataDir, 'jwt-secret');
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  const secret = crypto.randomBytes(48).toString('hex');
  fs.writeFileSync(file, secret);
  return secret;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  dbPath: process.env.DB_PATH || path.join(dataDir, 'carreq.db'),
  // Hosted Turso (libSQL) database. When unset, a local SQLite file at dbPath is used.
  tursoUrl: process.env.TURSO_DATABASE_URL || null,
  tursoAuthToken: process.env.TURSO_AUTH_TOKEN || undefined,
  jwtSecret: loadJwtSecret(),
  jwtExpiresIn: '180d',
  users: [
    {
      role: 'REQUESTER',
      username: (process.env.REQUESTER_USERNAME || 'hashim').toLowerCase(),
      displayName: process.env.REQUESTER_NAME || 'Hashim',
      password: process.env.REQUESTER_PASSWORD || 'change-me-requester',
    },
    {
      role: 'APPROVER',
      username: (process.env.APPROVER_USERNAME || 'kiran').toLowerCase(),
      displayName: process.env.APPROVER_NAME || 'Kiran',
      password: process.env.APPROVER_PASSWORD || 'change-me-approver',
    },
  ],
};
