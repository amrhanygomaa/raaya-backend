/**
 * US-13-01: Doctor Visits schema types
 */

export interface DoctorVisit {
  id: string;
  facilityId: string;
  residentId: string;
  doctorName: string;
  specialty?: string;
  visitDate: string;
  purpose?: string;
  results?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}
