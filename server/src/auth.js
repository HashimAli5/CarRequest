import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { getUserById, getUserByUsername } from './db.js';
import { HttpError } from './errors.js';

// Tiny in-memory brute-force guard: 10 failed attempts per username per 15 minutes.
const failures = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 10;

export async function login(username, password) {
  const key = String(username ?? '').trim().toLowerCase();
  const entry = failures.get(key);
  if (entry && entry.count >= MAX_FAILURES && Date.now() - entry.first < WINDOW_MS) {
    throw new HttpError(429, 'TOO_MANY_ATTEMPTS', 'Too many attempts. Try again in a few minutes.');
  }

  const user = await getUserByUsername(key);
  const ok = user && typeof password === 'string' && bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    const e = entry && Date.now() - entry.first < WINDOW_MS ? entry : { count: 0, first: Date.now() };
    e.count += 1;
    failures.set(key, e);
    throw new HttpError(401, 'INVALID_CREDENTIALS', 'Wrong username or password.');
  }
  failures.delete(key);

  const token = jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
  return { token, user: getUserById(user.id) ?? user };
}

/** Returns the user row for a valid token, or null. Role always comes from the DB, not the token. */
export function userFromToken(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return getUserById(Number(payload.sub)) ?? null;
  } catch {
    return null;
  }
}

export function requireAuth(req, _res, next) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const user = userFromToken(token);
  if (!user) return next(new HttpError(401, 'UNAUTHORIZED', 'Please sign in again.'));
  req.user = user;
  next();
}
