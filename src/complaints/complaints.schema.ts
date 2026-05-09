/**
 * US-07-03: Complaints schema types
 *
 * Interfaces for the complaints table + valid status transitions.
 * Maps 1:1 to migrations/005_create_complaints.sql.
 */

// ── Enums / union types ──────────────────────────────────────────────────

export type ComplaintStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';
export type ComplaintCategory =
  | 'care_quality'
  | 'staff_behavior'
  | 'facility'
  | 'food'
  | 'communication'
  | 'general'
  | 'other';

export const VALID_STATUSES: ComplaintStatus[] = [
  'open',
  'in_progress',
  'resolved',
  'closed',
];

export const VALID_PRIORITIES: ComplaintPriority[] = [
  'low',
  'medium',
  'high',
  'critical',
];

export const VALID_CATEGORIES: ComplaintCategory[] = [
  'care_quality',
  'staff_behavior',
  'facility',
  'food',
  'communication',
  'general',
  'other',
];

// ── Valid status transitions ────────────────────────────────────────────
//
//  open  ──►  in_progress  ──►  resolved  ──►  closed
//    │                             │
//    └─────────► closed ◄──────────┘
//
export const VALID_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  open: ['in_progress', 'closed'],
  in_progress: ['resolved', 'closed'],
  resolved: ['closed'],
  closed: [],                      // terminal state – no transitions out
};

/** Returns true if moving from `current` to `next` is allowed. */
export function isValidTransition(
  current: ComplaintStatus,
  next: ComplaintStatus,
): boolean {
  return VALID_TRANSITIONS[current]?.includes(next) ?? false;
}

// ── Interface ────────────────────────────────────────────────────────────

export interface Complaint {
  id: string;
  residentId?: string;
  facilityId: string;
  submittedBy: string;
  category: ComplaintCategory;
  subject: string;
  description?: string;
  status: ComplaintStatus;
  priority: ComplaintPriority;
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}
