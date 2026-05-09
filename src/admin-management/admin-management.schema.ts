export type ManagedUserRole =
  | 'Admin'
  | 'Doctor'
  | 'Nurse'
  | 'ClinicalStaff'
  | 'Family';

export type ManagedUserStatus = 'active' | 'disabled';

export const VALID_MANAGED_USER_ROLES: ManagedUserRole[] = [
  'Admin',
  'Doctor',
  'Nurse',
  'ClinicalStaff',
  'Family',
];

export const VALID_MANAGED_USER_STATUSES: ManagedUserStatus[] = [
  'active',
  'disabled',
];

export interface ManagedUser {
  id: string;
  cognitoSub?: string;
  facilityId: string;
  email: string;
  fullName: string;
  role: ManagedUserRole;
  status: ManagedUserStatus;
  createdBy: string;
  disabledBy?: string;
  disabledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VitalThresholdSetting {
  minValue?: number;
  maxValue?: number;
  unit?: string;
}

export interface FacilitySettings {
  id: string;
  facilityId: string;
  medicationReminderMinutesBefore: number;
  visitReminderHoursBefore: number;
  alertPushEnabled: boolean;
  timezone: string;
  vitalThresholds: Record<string, VitalThresholdSetting>;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}
