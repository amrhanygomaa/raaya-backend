/**
 * US-12-03: Shift Handoffs schema types
 *
 * Maps 1:1 to migrations/008_create_shift_handoffs.sql.
 */

export type ShiftType = 'morning' | 'evening' | 'night';

export const VALID_SHIFT_TYPES: ShiftType[] = ['morning', 'evening', 'night'];

export interface ShiftHandoff {
  id: string;
  facilityId: string;
  outgoingNurseId: string;
  incomingNurseId: string;
  shiftDate: string;
  shiftType: ShiftType;
  summary: string;
  residentsCovered: unknown[];
  pendingTasks: unknown[];
  createdAt: string;
}
