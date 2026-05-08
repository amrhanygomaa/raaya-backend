/**
 * US-03-01: Core resident-related schema types
 *
 * These interfaces represent the in-memory / DTO shape of the resident domain.
 * They map 1:1 to the SQL tables defined in migrations/001_create_residents.sql.
 */

export type ResidentStatus = 'active' | 'discharged' | 'deceased';
export type ResidentGender = 'male' | 'female' | 'other';
export type LinkedRecordType =
  | 'medication'
  | 'diagnosis'
  | 'lab_result'
  | 'incident'
  | 'care_plan'
  | 'document'
  | 'other';

export interface Resident {
  id: string;
  facilityId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date string YYYY-MM-DD
  gender: ResidentGender;
  nationalId?: string;
  roomNumber?: string;
  admissionDate: string; // ISO date string
  dischargeDate?: string;
  status: ResidentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  residentId: string;
  fullName: string;
  relationship: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LinkedRecord {
  id: string;
  residentId: string;
  recordType: LinkedRecordType;
  title: string;
  content?: Record<string, unknown>;
  recordedBy?: string;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

// ── Validation helpers ─────────────────────────────────────────────────────

export const VALID_GENDERS: ResidentGender[] = ['male', 'female', 'other'];
export const VALID_STATUSES: ResidentStatus[] = [
  'active',
  'discharged',
  'deceased',
];
export const VALID_RECORD_TYPES: LinkedRecordType[] = [
  'medication',
  'diagnosis',
  'lab_result',
  'incident',
  'care_plan',
  'document',
  'other',
];

export const isValidGender = (value: string): value is ResidentGender =>
  VALID_GENDERS.includes(value as ResidentGender);

export const isValidStatus = (value: string): value is ResidentStatus =>
  VALID_STATUSES.includes(value as ResidentStatus);

export const isValidRecordType = (value: string): value is LinkedRecordType =>
  VALID_RECORD_TYPES.includes(value as LinkedRecordType);

// ── Seed data factory (mirrors seed_residents.sql) ─────────────────────────

export const SEED_FACILITY_ID = 'facility-demo';

export const buildSeedResidents = (): Resident[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'a1b2c3d4-0000-0000-0000-000000000001',
      facilityId: SEED_FACILITY_ID,
      firstName: 'Ahmad',
      lastName: 'Al-Rashid',
      dateOfBirth: '1940-03-15',
      gender: 'male',
      nationalId: '1234567890',
      roomNumber: '101',
      admissionDate: '2025-01-10',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'a1b2c3d4-0000-0000-0000-000000000002',
      facilityId: SEED_FACILITY_ID,
      firstName: 'Fatimah',
      lastName: 'Al-Zahrani',
      dateOfBirth: '1935-07-20',
      gender: 'female',
      nationalId: '0987654321',
      roomNumber: '205',
      admissionDate: '2025-02-01',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'a1b2c3d4-0000-0000-0000-000000000003',
      facilityId: SEED_FACILITY_ID,
      firstName: 'Omar',
      lastName: 'Al-Ghamdi',
      dateOfBirth: '1942-11-05',
      gender: 'male',
      roomNumber: '312',
      admissionDate: '2025-03-15',
      status: 'active',
      notes: 'Demo resident used by the AI weekly summary job',
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const buildSeedFamilyMembers = (): FamilyMember[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'b1000000-0000-0000-0000-000000000001',
      residentId: 'a1b2c3d4-0000-0000-0000-000000000001',
      fullName: 'Khalid Al-Rashid',
      relationship: 'son',
      phone: '+966501234567',
      email: 'khalid@example.sa',
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'b1000000-0000-0000-0000-000000000002',
      residentId: 'a1b2c3d4-0000-0000-0000-000000000001',
      fullName: 'Sara Al-Rashid',
      relationship: 'daughter',
      phone: '+966509876543',
      email: 'sara@example.sa',
      isPrimary: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'b2000000-0000-0000-0000-000000000001',
      residentId: 'a1b2c3d4-0000-0000-0000-000000000002',
      fullName: 'Mohammed Al-Zahrani',
      relationship: 'son',
      phone: '+966502345678',
      email: 'mohammed@example.sa',
      isPrimary: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
};

export const buildSeedLinkedRecords = (): LinkedRecord[] => {
  const now = new Date().toISOString();
  return [
    {
      id: 'c1000000-0000-0000-0000-000000000001',
      residentId: 'a1b2c3d4-0000-0000-0000-000000000001',
      recordType: 'medication',
      title: 'Morning Medication',
      content: {
        drugs: ['Aspirin 100mg', 'Metformin 500mg'],
        frequency: 'daily',
        time: '08:00',
      },
      recordedBy: 'system-seed',
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c1000000-0000-0000-0000-000000000002',
      residentId: 'a1b2c3d4-0000-0000-0000-000000000001',
      recordType: 'diagnosis',
      title: 'Primary Diagnoses',
      content: {
        conditions: ['Type 2 Diabetes', 'Hypertension'],
        icd10: ['E11', 'I10'],
      },
      recordedBy: 'system-seed',
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'c2000000-0000-0000-0000-000000000001',
      residentId: 'a1b2c3d4-0000-0000-0000-000000000002',
      recordType: 'care_plan',
      title: 'Weekly Care Plan',
      content: {
        goals: ['Improve mobility', 'Monitor blood pressure'],
        review_date: '2025-06-01',
      },
      recordedBy: 'system-seed',
      recordedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  ];
};
