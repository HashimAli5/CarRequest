export type Role = 'REQUESTER' | 'APPROVER';

export type User = {
  id: number;
  username: string;
  name: string;
  role: Role;
  /** Display name of the other user (approver for the requester, and vice versa). */
  partnerName: string | null;
};

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALTERNATIVE_PROPOSED' | 'DECLINED';

export type CarRequest = {
  id: string;
  requesterId: number;
  requesterName: string;
  approverId: number;
  approverName: string;

  /** YYYY-MM-DD — never changes after creation */
  requestedDate: string;
  /** HH:MM (24h) — never changes after creation */
  requestedStartTime: string;
  requestedEndTime: string;

  reason: string | null;
  customReason: string | null;

  status: RequestStatus;
  rejectionReason: string | null;

  alternativeStartTime: string | null;
  alternativeEndTime: string | null;
  alternativeProposedAt: string | null;
  alternativeRespondedAt: string | null;

  finalStartTime: string | null;
  finalEndTime: string | null;

  createdAt: string;
  updatedAt: string;
  decisionAt: string | null;
};

export const REASONS = [
  'Going out with friends',
  'Going to university',
  'Going to work',
  'Shopping',
  'Meeting someone',
  'Family plans',
  'Running an errand',
  'Other',
] as const;

export function displayReason(r: Pick<CarRequest, 'reason' | 'customReason'>): string | null {
  if (r.reason === 'Other') return r.customReason || 'Other';
  return r.reason;
}
