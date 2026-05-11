/**
 * US-13-05: Prescriptions schema types
 */

export interface Prescription {
  id: string;
  facilityId: string;
  residentId: string;
  title: string;
  doctorName?: string;
  prescriptionDate: string;
  fileUrl?: string;
  createdAt: string;
}
