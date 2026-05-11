/**
 * US-15-07: Notifications schema types
 *
 * Maps 1:1 to migrations/009_create_notifications.sql.
 */

export type NotificationType =
  | 'medication_reminder'
  | 'vital_alert'
  | 'complaint'
  | 'visit_reminder'
  | 'ai_summary';

export const VALID_TYPES: NotificationType[] = [
  'medication_reminder',
  'vital_alert',
  'complaint',
  'visit_reminder',
  'ai_summary',
];

export interface Notification {
  id: string;
  facilityId: string;
  userId: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: string;
}
