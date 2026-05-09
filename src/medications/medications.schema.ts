/**
 * US-04-01: Medication-related schema types
 *
 * These interfaces represent the in-memory / DTO shape of the medication domain.
 * They map 1:1 to the SQL tables defined in migrations/002_create_medications.sql.
 */

// ── Enums / union types ──────────────────────────────────────────────────

export type MedicationRoute =
  | 'oral'
  | 'iv'
  | 'im'
  | 'sc'
  | 'topical'
  | 'inhalation'
  | 'sublingual'
  | 'rectal'
  | 'other';

export type MedicationFrequency =
  | 'once'
  | 'daily'
  | 'bid'
  | 'tid'
  | 'qid'
  | 'weekly'
  | 'prn'
  | 'other';

export type DoseStatus = 'pending' | 'given' | 'skipped' | 'missed';

// ── Validation arrays ────────────────────────────────────────────────────

export const VALID_ROUTES: MedicationRoute[] = [
  'oral', 'iv', 'im', 'sc', 'topical',
  'inhalation', 'sublingual', 'rectal', 'other',
];

export const VALID_FREQUENCIES: MedicationFrequency[] = [
  'once', 'daily', 'bid', 'tid', 'qid',
  'weekly', 'prn', 'other',
];

export const VALID_DOSE_STATUSES: DoseStatus[] = [
  'pending', 'given', 'skipped', 'missed',
];

// ── Type guards ──────────────────────────────────────────────────────────

export const isValidRoute = (v: string): v is MedicationRoute =>
  VALID_ROUTES.includes(v as MedicationRoute);

export const isValidFrequency = (v: string): v is MedicationFrequency =>
  VALID_FREQUENCIES.includes(v as MedicationFrequency);

export const isValidDoseStatus = (v: string): v is DoseStatus =>
  VALID_DOSE_STATUSES.includes(v as DoseStatus);

// ── Interfaces ───────────────────────────────────────────────────────────

export interface MedicationSchedule {
  id: string;
  residentId: string;
  facilityId: string;
  medicationName: string;
  dosage: string;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  scheduledTimes: string[];     // e.g. ['08:00', '20:00']
  startDate: string;            // ISO date YYYY-MM-DD
  endDate?: string;
  isActive: boolean;
  prescriber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoseLog {
  id: string;
  scheduleId: string;
  residentId: string;
  facilityId: string;
  scheduledTime: string;        // ISO datetime
  status: DoseStatus;
  administeredAt?: string;      // ISO datetime
  administeredBy?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Overdue dose returned by the overdue query – includes medication context. */
export interface OverdueDose extends DoseLog {
  medicationName: string;
  dosage: string;
  residentFirstName: string;
  residentLastName: string;
  roomNumber?: string;
}

// ── Adherence reporting (US-04-05) ──────────────────────────────────────

export type AdherencePeriod = 'weekly' | 'monthly';

export const VALID_ADHERENCE_PERIODS: AdherencePeriod[] = ['weekly', 'monthly'];

export interface AdherenceSummary {
  totalDoses: number;
  givenDoses: number;
  percentage: number;
}

export interface ResidentAdherence extends AdherenceSummary {
  residentId: string;
  residentFirstName: string;
  residentLastName: string;
  roomNumber?: string;
}

export interface AdherenceReport {
  period: AdherencePeriod;
  from: string;
  to: string;
  facilityId: string;
  facilityAdherence: AdherenceSummary;
  residents: ResidentAdherence[];
}
