/**
 * US-12-05: Care Tasks schema types
 *
 * Maps 1:1 to migrations/011_create_care_tasks.sql.
 */

export type CareTaskCategory = 'personal' | 'recreational' | 'hotel';

export const VALID_CATEGORIES: CareTaskCategory[] = [
  'personal',
  'recreational',
  'hotel',
];

export interface CareTask {
  id: string;
  facilityId: string;
  residentId: string;
  title: string;
  category: CareTaskCategory;
  scheduledTime?: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
