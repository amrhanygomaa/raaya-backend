/**
 * US-06-01: Health module schema types
 *
 * Interfaces for vital_signs, vital_alerts, and vital_thresholds tables.
 * Maps 1:1 to migrations/004_create_health.sql.
 */

// ── Enums / union types ──────────────────────────────────────────────────

export type AlertSeverity = 'warning' | 'critical';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export const VALID_ALERT_SEVERITIES: AlertSeverity[] = ['warning', 'critical'];
export const VALID_ALERT_STATUSES: AlertStatus[] = [
  'active',
  'acknowledged',
  'resolved',
];

export const VITAL_TYPES = [
  'heart_rate',
  'blood_pressure_systolic',
  'blood_pressure_diastolic',
  'temperature',
  'respiratory_rate',
  'oxygen_saturation',
  'blood_glucose',
] as const;

export type VitalType = (typeof VITAL_TYPES)[number];

// ── Interfaces ───────────────────────────────────────────────────────────

export interface VitalSign {
  id: string;
  residentId: string;
  facilityId: string;
  recordedBy: string;
  recordedAt: string;
  heartRate?: number;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  temperature?: number;
  respiratoryRate?: number;
  oxygenSaturation?: number;
  bloodGlucose?: number;
  weight?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VitalAlert {
  id: string;
  vitalSignId: string;
  residentId: string;
  facilityId: string;
  vitalType: string;
  recordedValue: number;
  thresholdMin?: number;
  thresholdMax?: number;
  severity: AlertSeverity;
  status: AlertStatus;
  acknowledgedBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VitalThreshold {
  id: string;
  facilityId: string;
  vitalType: string;
  minValue?: number;
  maxValue?: number;
  unit: string;
  createdAt: string;
  updatedAt: string;
}

/** Result returned after recording vitals – includes any triggered alerts. */
export interface RecordVitalsResult {
  vitalSign: VitalSign;
  alerts: VitalAlert[];
}
