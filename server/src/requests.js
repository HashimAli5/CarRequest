/**
 * Request lifecycle — the single source of truth for every state transition.
 *
 *   PENDING ──approve──────────────▶ APPROVED
 *   PENDING ──reject (reason)──────▶ REJECTED
 *   PENDING ──propose alternative──▶ ALTERNATIVE_PROPOSED ──accept──▶ APPROVED
 *                                                         └─decline─▶ DECLINED
 *
 * The originally requested date/time columns are written once on creation and never updated.
 * Every transition is a conditional UPDATE (… WHERE status = <expected>), so two racing
 * actions can never both succeed.
 */
import crypto from 'node:crypto';
import { db, getUserById, getUserByRole } from './db.js';
import { badRequest, conflict, forbidden, notFound } from './errors.js';
import { formatDate, formatRange, todayYmd, toMinutes } from './format.js';
import { sendPush } from './push.js';
import { emitToUser } from './realtime.js';

export const REASONS = [
  'Going out with friends',
  'Going to university',
  'Going to work',
  'Shopping',
  'Meeting someone',
  'Family plans',
  'Running an errand',
  'Other',
];

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'ALTERNATIVE_PROPOSED', 'DECLINED'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// A request for "now" shouldn't fail because a minute ticked by while filling the form.
const START_GRACE_MINUTES = 15;

// ---------------------------------------------------------------------------
// Serialization

function serialize(row) {
  if (!row) return null;
  const requester = getUserById(row.requester_id);
  const approver = getUserById(row.approver_id);
  return {
    id: row.id,
    requesterId: Number(row.requester_id),
    requesterName: requester?.display_name ?? 'Requester',
    approverId: Number(row.approver_id),
    approverName: approver?.display_name ?? 'Approver',
    requestedDate: row.requested_date,
    requestedStartTime: row.requested_start_time,
    requestedEndTime: row.requested_end_time,
    reason: row.reason,
    customReason: row.custom_reason,
    status: row.status,
    rejectionReason: row.rejection_reason,
    alternativeStartTime: row.alternative_start_time,
    alternativeEndTime: row.alternative_end_time,
    alternativeProposedAt: row.alternative_proposed_at,
    alternativeRespondedAt: row.alternative_responded_at,
    finalStartTime: row.final_start_time,
    finalEndTime: row.final_end_time,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    decisionAt: row.decision_at,
  };
}

const getRow = (id) => db.get('SELECT * FROM requests WHERE id = ?', id);

// ---------------------------------------------------------------------------
// Validation helpers

function validateTimeRange(start, end) {
  if (!start) throw badRequest('Start time is required.');
  if (!end) throw badRequest('End time is required.');
  if (!TIME_RE.test(start) || !TIME_RE.test(end)) throw badRequest('Times must be in HH:MM format.');
  if (toMinutes(end) <= toMinutes(start)) throw badRequest('End time must be after the start time.');
}

function validateDate(date) {
  if (!date) throw badRequest('Date is required.');
  if (!DATE_RE.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00`))) {
    throw badRequest('Date is invalid.');
  }
  if (date < todayYmd()) throw badRequest("You can't request the car for a date in the past.");
}

// ---------------------------------------------------------------------------
// Access control

/** Returns the row if `user` is a party to it, otherwise throws (404 to avoid leaking ids). */
async function getAccessibleRow(user, id) {
  const row = typeof id === 'string' && id.length <= 64 ? await getRow(id) : undefined;
  if (!row) throw notFound();
  const userId = Number(user.id);
  const isParty =
    (user.role === 'REQUESTER' && Number(row.requester_id) === userId) ||
    (user.role === 'APPROVER' && Number(row.approver_id) === userId);
  if (!isParty) throw notFound();
  return row;
}

function requireRole(user, role) {
  if (user.role !== role) throw forbidden();
}

function assertStatus(row, expected, message) {
  if (row.status !== expected) throw conflict(message, 'INVALID_STATE');
}

function assertNotPast(row) {
  if (row.requested_date < todayYmd()) throw conflict("This request's date has already passed.", 'EXPIRED');
}

/** A conditional UPDATE that matched nothing means someone else got there first. */
function assertChanged({ changes }, message) {
  if (changes === 0) throw conflict(message, 'INVALID_STATE');
}

// ---------------------------------------------------------------------------
// Notifications (push + realtime)

async function broadcastUpdate(id) {
  const request = serialize(await getRow(id));
  emitToUser(request.requesterId, 'request:updated', request);
  emitToUser(request.approverId, 'request:updated', request);
  return request;
}

function notify(userId, request, type, title, body) {
  const data = { requestId: request.id, type };
  emitToUser(userId, 'notification', { title, body, data });
  void sendPush(userId, { title, body, data });
}

// ---------------------------------------------------------------------------
// Queries

export async function listRequests(user, { status } = {}) {
  const column = user.role === 'REQUESTER' ? 'requester_id' : 'approver_id';
  const rows =
    status && STATUSES.includes(status)
      ? await db.all(
          `SELECT * FROM requests WHERE ${column} = ? AND status = ? ORDER BY created_at DESC, rowid DESC`,
          user.id,
          status
        )
      : await db.all(`SELECT * FROM requests WHERE ${column} = ? ORDER BY created_at DESC, rowid DESC`, user.id);
  return rows.map(serialize);
}

export async function getRequest(user, id) {
  return serialize(await getAccessibleRow(user, id));
}

// ---------------------------------------------------------------------------
// Requester actions

export async function createRequest(user, input) {
  requireRole(user, 'REQUESTER');
  const { clientRequestId, date, startTime, endTime } = input ?? {};
  const reason = input?.reason || null;
  const customReason = typeof input?.customReason === 'string' ? input.customReason.trim() : '';

  // Idempotent retry: same client id -> return the request that was already created.
  const findByClientId = () =>
    db.get('SELECT * FROM requests WHERE client_request_id = ? AND requester_id = ?', clientRequestId, user.id);
  if (clientRequestId) {
    if (typeof clientRequestId !== 'string' || clientRequestId.length > 100) {
      throw badRequest('Invalid client request id.');
    }
    const existing = await findByClientId();
    if (existing) return { request: serialize(existing), created: false };
  }

  validateDate(date);
  validateTimeRange(startTime, endTime);
  if (date === todayYmd()) {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (toMinutes(startTime) < nowMinutes - START_GRACE_MINUTES) {
      throw badRequest('That start time has already passed today.');
    }
  }
  if (reason !== null && !REASONS.includes(reason)) throw badRequest('Please choose a valid reason.');
  if (reason === 'Other' && !customReason) throw badRequest('Please tell us why you need the car.');
  if (customReason.length > 200) throw badRequest('Reason must be 200 characters or fewer.');

  const duplicate = await db.get(
    `SELECT id FROM requests
     WHERE requester_id = ? AND requested_date = ? AND requested_start_time = ? AND requested_end_time = ?
       AND status IN ('PENDING', 'ALTERNATIVE_PROPOSED')`,
    user.id,
    date,
    startTime,
    endTime
  );
  if (duplicate) throw conflict('You already have a request for this time.', 'DUPLICATE_REQUEST');

  const approver = getUserByRole('APPROVER');
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await db.run(
      `INSERT INTO requests (id, client_request_id, requester_id, approver_id, requested_date,
         requested_start_time, requested_end_time, reason, custom_reason, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      id,
      clientRequestId || null,
      user.id,
      approver.id,
      date,
      startTime,
      endTime,
      reason,
      reason === 'Other' ? customReason : null,
      now,
      now
    );
  } catch (err) {
    // Two retries raced past the lookup above: the UNIQUE client id makes the second one lose.
    if (clientRequestId && /UNIQUE/i.test(String(err?.message))) {
      const existing = await findByClientId();
      if (existing) return { request: serialize(existing), created: false };
    }
    throw err;
  }

  const request = await broadcastUpdate(id);
  notify(
    approver.id,
    request,
    'NEW_REQUEST',
    'New Car Request',
    `${user.display_name} wants to use the car on ${formatDate(date)} from ${formatRange(startTime, endTime)}. Tap to review.`
  );
  return { request, created: true };
}

const NOT_WAITING = 'This suggestion is no longer waiting for a response.';
const ALREADY_ANSWERED = 'This request has already been answered.';

export async function acceptAlternative(user, id) {
  requireRole(user, 'REQUESTER');
  const row = await getAccessibleRow(user, id);
  assertStatus(row, 'ALTERNATIVE_PROPOSED', NOT_WAITING);
  assertNotPast(row);
  const now = new Date().toISOString();
  assertChanged(
    await db.run(
      `UPDATE requests SET status = 'APPROVED', final_start_time = alternative_start_time,
         final_end_time = alternative_end_time, alternative_responded_at = ?, decision_at = ?, updated_at = ?
       WHERE id = ? AND status = 'ALTERNATIVE_PROPOSED'`,
      now,
      now,
      now,
      id
    ),
    NOT_WAITING
  );

  const request = await broadcastUpdate(id);
  notify(
    row.approver_id,
    request,
    'ALTERNATIVE_ACCEPTED',
    'Time Accepted',
    `${user.display_name} accepted the suggested time. ${formatDate(row.requested_date)}, ${formatRange(
      row.alternative_start_time,
      row.alternative_end_time
    )}`
  );
  return request;
}

export async function declineAlternative(user, id) {
  requireRole(user, 'REQUESTER');
  const row = await getAccessibleRow(user, id);
  assertStatus(row, 'ALTERNATIVE_PROPOSED', NOT_WAITING);
  assertNotPast(row);
  const now = new Date().toISOString();
  assertChanged(
    await db.run(
      `UPDATE requests SET status = 'DECLINED', alternative_responded_at = ?, updated_at = ?
       WHERE id = ? AND status = 'ALTERNATIVE_PROPOSED'`,
      now,
      now,
      id
    ),
    NOT_WAITING
  );

  const request = await broadcastUpdate(id);
  notify(
    row.approver_id,
    request,
    'ALTERNATIVE_DECLINED',
    'Alternative Time Declined',
    `${user.display_name} declined the suggested time of ${formatRange(
      row.alternative_start_time,
      row.alternative_end_time
    )}.`
  );
  return request;
}

// ---------------------------------------------------------------------------
// Approver actions

export async function approveRequest(user, id) {
  requireRole(user, 'APPROVER');
  const row = await getAccessibleRow(user, id);
  assertStatus(row, 'PENDING', ALREADY_ANSWERED);
  assertNotPast(row);
  const now = new Date().toISOString();
  assertChanged(
    await db.run(
      `UPDATE requests SET status = 'APPROVED', final_start_time = requested_start_time,
         final_end_time = requested_end_time, decision_at = ?, updated_at = ?
       WHERE id = ? AND status = 'PENDING'`,
      now,
      now,
      id
    ),
    ALREADY_ANSWERED
  );

  const request = await broadcastUpdate(id);
  notify(
    row.requester_id,
    request,
    'APPROVED',
    'Car Request Approved',
    `Your request for ${formatDate(row.requested_date)} from ${formatRange(
      row.requested_start_time,
      row.requested_end_time
    )} was approved.`
  );
  return request;
}

export async function rejectRequest(user, id, input) {
  requireRole(user, 'APPROVER');
  const reason = typeof input?.reason === 'string' ? input.reason.trim() : '';
  if (!reason) throw badRequest('Please provide a reason for rejecting.');
  if (reason.length > 300) throw badRequest('Reason must be 300 characters or fewer.');
  const row = await getAccessibleRow(user, id);
  assertStatus(row, 'PENDING', ALREADY_ANSWERED);
  assertNotPast(row);
  const now = new Date().toISOString();
  assertChanged(
    await db.run(
      `UPDATE requests SET status = 'REJECTED', rejection_reason = ?, decision_at = ?, updated_at = ?
       WHERE id = ? AND status = 'PENDING'`,
      reason,
      now,
      now,
      id
    ),
    ALREADY_ANSWERED
  );

  const request = await broadcastUpdate(id);
  notify(
    row.requester_id,
    request,
    'REJECTED',
    'Car Request Rejected',
    `Your request for ${formatDate(row.requested_date)} from ${formatRange(
      row.requested_start_time,
      row.requested_end_time
    )} was rejected.\nReason: "${reason}"`
  );
  return request;
}

export async function proposeAlternative(user, id, input) {
  requireRole(user, 'APPROVER');
  const { startTime, endTime } = input ?? {};
  validateTimeRange(startTime, endTime);
  const row = await getAccessibleRow(user, id);
  assertStatus(row, 'PENDING', ALREADY_ANSWERED);
  assertNotPast(row);
  if (startTime === row.requested_start_time && endTime === row.requested_end_time) {
    throw badRequest("That's the same as the requested time. Use Approve instead.");
  }
  // The alternative is always on the originally requested date — no date is accepted from the client.
  const now = new Date().toISOString();
  assertChanged(
    await db.run(
      `UPDATE requests SET status = 'ALTERNATIVE_PROPOSED', alternative_start_time = ?, alternative_end_time = ?,
         alternative_proposed_at = ?, updated_at = ?
       WHERE id = ? AND status = 'PENDING'`,
      startTime,
      endTime,
      now,
      now,
      id
    ),
    ALREADY_ANSWERED
  );

  const request = await broadcastUpdate(id);
  notify(
    row.requester_id,
    request,
    'ALTERNATIVE_PROPOSED',
    'Alternative Car Time',
    `The car isn't available during your requested time. Available on ${formatDate(
      row.requested_date
    )}: ${formatRange(startTime, endTime)}. Tap to respond.`
  );
  return request;
}
