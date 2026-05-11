/**
 * US-12-01: Nursing Notes schema types
 *
 * Interfaces for the nursing_notes table.
 * Maps 1:1 to migrations/007_create_nursing_notes.sql.
 */

export type NursingNoteCategory = 'routine' | 'concern' | 'handoff';

export const VALID_CATEGORIES: NursingNoteCategory[] = [
  'routine',
  'concern',
  'handoff',
];

export interface NursingNote {
  id: string;
  facilityId: string;
  residentId: string;
  authorId: string;
  content: string;
  category: NursingNoteCategory;
  createdAt: string;
  updatedAt: string;
}
