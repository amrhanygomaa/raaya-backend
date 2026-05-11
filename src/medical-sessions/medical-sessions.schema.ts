/**
 * US-13-03: Medical Sessions schema types
 */

export type MedicalSessionType = 'doctor' | 'pt' | 'vitals';

export const VALID_TYPES: MedicalSessionType[] = ['doctor', 'pt', 'vitals'];

export interface MedicalSession {
  id: string;
  facilityId: string;
  residentId: string;
  type: MedicalSessionType;
  specialistName?: string;
  sessionDate: string;
  sessionTime?: string;
  notes?: string;
  createdAt: string;
}
