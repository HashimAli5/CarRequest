// End-to-end check of the whole request lifecycle against a throwaway database.
// Usage: npm test
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { io as connect } from 'socket.io-client';

const here = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'carreq-'));
const PORT = 4999;
const BASE = `http://127.0.0.1:${PORT}`;
const env = {
  ...process.env,
  PORT: String(PORT),
  DB_PATH: path.join(tmp, 'test.db'),
  // Never touch the real cloud database from tests.
  TURSO_DATABASE_URL: '',
  TURSO_AUTH_TOKEN: '',
  NODE_ENV: 'test',
  JWT_SECRET: 'test-secret',
  REQUESTER_USERNAME: 'req',
  REQUESTER_NAME: 'Hashim',
  REQUESTER_PASSWORD: 'pw-req',
  APPROVER_USERNAME: 'app',
  APPROVER_NAME: 'Kiran',
  APPROVER_PASSWORD: 'pw-app',
};

const server = spawn(process.execPath, ['--disable-warning=ExperimentalWarning', path.join(here, 'index.js')], {
  env,
  stdio: ['ignore', 'pipe', 'inherit'],
});
await new Promise((resolve) => server.stdout.on('data', (d) => d.toString().includes('running') && resolve()));

async function call(method, url, token, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const ymd = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const tomorrow = ymd(new Date(Date.now() + 86400000));
const yesterday = ymd(new Date(Date.now() - 86400000));

try {
  // Auth
  assert.equal((await call('POST', '/auth/login', null, { username: 'req', password: 'nope' })).status, 401);
  const R = (await call('POST', '/auth/login', null, { username: 'req', password: 'pw-req' })).body.token;
  const A = (await call('POST', '/auth/login', null, { username: 'APP', password: 'pw-app' })).body.token;
  assert.ok(R && A);
  assert.equal((await call('GET', '/requests')).status, 401);

  // Realtime: approver should be told about the new request
  const sock = connect(BASE, { auth: { token: A }, transports: ['websocket'] });
  const gotNotification = new Promise((resolve) => sock.on('notification', resolve));
  await new Promise((resolve) => sock.on('connect', resolve));

  // Validation
  const base = { date: tomorrow, startTime: '18:00', endTime: '22:00', reason: 'Going out with friends' };
  assert.equal((await call('POST', '/requests', R, { ...base, date: yesterday })).status, 400);
  assert.equal((await call('POST', '/requests', R, { ...base, endTime: '17:00' })).status, 400);
  assert.equal((await call('POST', '/requests', R, { ...base, reason: 'Other' })).status, 400);
  assert.equal((await call('POST', '/requests', A, base)).status, 403, 'approver cannot create');

  // Create + idempotent retry + duplicate guard
  const c1 = await call('POST', '/requests', R, { ...base, clientRequestId: 'abc' });
  assert.equal(c1.status, 201);
  assert.equal(c1.body.request.status, 'PENDING');
  const retry = await call('POST', '/requests', R, { ...base, clientRequestId: 'abc' });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.request.id, c1.body.request.id);
  const dup = await call('POST', '/requests', R, { ...base, clientRequestId: 'def' });
  assert.equal(dup.status, 409);
  assert.equal(dup.body.error.message, 'You already have a request for this time.');
  const n = await gotNotification;
  assert.equal(n.title, 'New Car Request');
  sock.close();

  // Requester cannot approve; approver approves
  const id1 = c1.body.request.id;
  assert.equal((await call('POST', `/requests/${id1}/approve`, R)).status, 403);
  const ap = await call('POST', `/requests/${id1}/approve`, A);
  assert.equal(ap.body.request.status, 'APPROVED');
  assert.equal(ap.body.request.finalStartTime, '18:00');
  assert.ok(ap.body.request.decisionAt);
  assert.equal((await call('POST', `/requests/${id1}/reject`, A, { reason: 'x' })).status, 409, 'finalized');

  // Reject requires reason
  const id2 = (await call('POST', '/requests', R, { ...base, startTime: '10:00', endTime: '12:00' })).body.request.id;
  assert.equal((await call('POST', `/requests/${id2}/reject`, A, { reason: '  ' })).status, 400);
  const rj = await call('POST', `/requests/${id2}/reject`, A, { reason: 'I need the car that evening.' });
  assert.equal(rj.body.request.status, 'REJECTED');
  assert.equal(rj.body.request.rejectionReason, 'I need the car that evening.');

  // Alternative -> accept
  const id3 = (await call('POST', '/requests', R, { ...base, startTime: '19:00', endTime: '23:00' })).body.request.id;
  assert.equal((await call('POST', `/requests/${id3}/propose`, A, { startTime: '19:00', endTime: '23:00' })).status, 400);
  assert.equal((await call('POST', `/requests/${id3}/propose`, A, { startTime: '18:00', endTime: '17:00' })).status, 400);
  const pr = await call('POST', `/requests/${id3}/propose`, A, { startTime: '17:00', endTime: '18:30' });
  assert.equal(pr.body.request.status, 'ALTERNATIVE_PROPOSED');
  assert.equal((await call('POST', `/requests/${id3}/accept`, A)).status, 403, 'approver cannot accept');
  const acc = await call('POST', `/requests/${id3}/accept`, R);
  assert.equal(acc.body.request.status, 'APPROVED');
  assert.equal(acc.body.request.finalStartTime, '17:00');
  assert.equal(acc.body.request.requestedStartTime, '19:00', 'original time preserved');
  assert.ok(acc.body.request.alternativeRespondedAt && acc.body.request.decisionAt);

  // Alternative -> decline
  const id4 = (await call('POST', '/requests', R, { ...base, startTime: '08:00', endTime: '09:00' })).body.request.id;
  await call('POST', `/requests/${id4}/propose`, A, { startTime: '07:00', endTime: '08:30' });
  const dec = await call('POST', `/requests/${id4}/decline`, R);
  assert.equal(dec.body.request.status, 'DECLINED');
  assert.equal((await call('POST', `/requests/${id4}/accept`, R)).status, 409);

  // Racing decisions: exactly one wins
  const id5 = (await call('POST', '/requests', R, { ...base, startTime: '13:00', endTime: '14:00' })).body.request.id;
  const [a, b] = await Promise.all([
    call('POST', `/requests/${id5}/approve`, A),
    call('POST', `/requests/${id5}/reject`, A, { reason: 'busy' }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [200, 409], 'only one racing decision succeeds');

  // Listing is newest first and scoped
  const list = (await call('GET', '/requests', R)).body.requests;
  assert.equal(list.length, 5);
  assert.equal(list[0].id, id5);

  console.log('✅ All lifecycle checks passed.');
} catch (err) {
  console.error('❌ Smoke test failed:', err);
  process.exitCode = 1;
} finally {
  server.kill();
  setTimeout(() => fs.rmSync(tmp, { recursive: true, force: true }), 300);
}
