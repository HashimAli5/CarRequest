import http from 'node:http';
import os from 'node:os';
import express from 'express';
import { config } from './config.js';
import { initDb, publicUser } from './db.js';
import { login, requireAuth } from './auth.js';
import { HttpError } from './errors.js';
import { attachRealtime } from './realtime.js';
import { savePushToken, removePushToken } from './push.js';
import * as Requests from './requests.js';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '20kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));

// --- Auth -------------------------------------------------------------------
app.post('/auth/login', async (req, res) => {
  const { token, user } = await login(req.body?.username, req.body?.password);
  res.json({ token, user: publicUser(user) });
});

app.use(requireAuth); // everything below requires a valid session

app.get('/me', (req, res) => res.json({ user: publicUser(req.user) }));

app.post('/push-tokens', async (req, res) => {
  const ok = await savePushToken(req.user.id, req.body?.token, req.body?.platform);
  if (!ok) throw new HttpError(400, 'VALIDATION_ERROR', 'Invalid push token.');
  res.json({ ok: true });
});

app.delete('/push-tokens', async (req, res) => {
  await removePushToken(req.user.id, req.body?.token);
  res.json({ ok: true });
});

// --- Requests ---------------------------------------------------------------
app.get('/requests', async (req, res) => {
  res.json({ requests: await Requests.listRequests(req.user, { status: req.query.status }) });
});

app.get('/requests/:id', async (req, res) => {
  res.json({ request: await Requests.getRequest(req.user, req.params.id) });
});

app.post('/requests', async (req, res) => {
  const { request, created } = await Requests.createRequest(req.user, req.body);
  res.status(created ? 201 : 200).json({ request });
});

app.post('/requests/:id/approve', async (req, res) => {
  res.json({ request: await Requests.approveRequest(req.user, req.params.id) });
});

app.post('/requests/:id/reject', async (req, res) => {
  res.json({ request: await Requests.rejectRequest(req.user, req.params.id, req.body) });
});

app.post('/requests/:id/propose', async (req, res) => {
  res.json({ request: await Requests.proposeAlternative(req.user, req.params.id, req.body) });
});

app.post('/requests/:id/accept', async (req, res) => {
  res.json({ request: await Requests.acceptAlternative(req.user, req.params.id) });
});

app.post('/requests/:id/decline', async (req, res) => {
  res.json({ request: await Requests.declineAlternative(req.user, req.params.id) });
});

// --- Errors -----------------------------------------------------------------
app.use((_req, _res, next) => next(new HttpError(404, 'NOT_FOUND', 'Not found.')));
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_JSON', message: 'Invalid request body.' } });
  }
  console.error(err);
  res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Something went wrong.' } });
});

// --- Start ------------------------------------------------------------------
await initDb();
const server = http.createServer(app);
attachRealtime(server);

server.listen(config.port, '0.0.0.0', () => {
  const lan = Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => `http://${i.address}:${config.port}`);
  console.log(`\n🚗  Can I Take the Car? — server running on port ${config.port}`);
  console.log(`    Local:   http://localhost:${config.port}`);
  lan.forEach((url) => console.log(`    Network: ${url}`));
  console.log('');
});
