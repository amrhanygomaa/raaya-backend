/**
 * US-05-01: Family Bridge schema types
 *
 * Interfaces for media_items and visits tables.
 * Maps 1:1 to migrations/003_create_family_bridge.sql.
 */

// ── Enums / union types ──────────────────────────────────────────────────

export type MediaStatus = 'pending_upload' | 'confirmed' | 'rejected';

export type VisitStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'cancelled';

// ── Validation arrays ────────────────────────────────────────────────────

export const VALID_MEDIA_STATUSES: MediaStatus[] = [
  'pending_upload',
  'confirmed',
  'rejected',
];

export const VALID_VISIT_STATUSES: VisitStatus[] = [
  'pending',
  'approved',
  'rejected',
  'completed',
  'cancelled',
];

// ── Interfaces ───────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  residentId: string;
  facilityId: string;
  uploadedBy: string;
  s3Key: string;
  fileName: string;
  contentType: string;
  fileSizeBytes?: number;
  status: MediaStatus;
  caption?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUploadResult {
  media: MediaItem;
  presignedUrl: string;
}

export interface Visit {
  id: string;
  residentId: string;
  facilityId: string;
  visitorName: string;
  visitorRelationship: string;
  bookedBy: string;
  visitDate: string;
  visitTimeStart: string;
  visitTimeEnd: string;
  status: VisitStatus;
  approvedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
