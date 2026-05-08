/**
 * US-03-01 – Design the core resident-related schema and migrations (unit tests)
 *
 * Acceptance criteria:
 *  - Resident and family relations are present with the expected keys
 *  - The seed command creates working sample records
 *  - Schema validators correctly classify valid / invalid values
 */

import {
  VALID_GENDERS,
  VALID_STATUSES,
  VALID_RECORD_TYPES,
  isValidGender,
  isValidStatus,
  isValidRecordType,
  buildSeedResidents,
  buildSeedFamilyMembers,
  buildSeedLinkedRecords,
  SEED_FACILITY_ID,
  Resident,
  FamilyMember,
  LinkedRecord,
} from './residents.schema';

// ── Schema type validation ─────────────────────────────────────────────────

describe('ResidentGender validator', () => {
  it('accepts all valid genders', () => {
    expect(VALID_GENDERS.every(isValidGender)).toBe(true);
  });

  it.each(['male', 'female', 'other'])('accepts %s', (g) => {
    expect(isValidGender(g)).toBe(true);
  });

  it.each(['Male', 'FEMALE', 'unknown', ''])(
    'rejects invalid gender: %s',
    (g) => {
      expect(isValidGender(g)).toBe(false);
    },
  );
});

describe('ResidentStatus validator', () => {
  it('accepts all valid statuses', () => {
    expect(VALID_STATUSES.every(isValidStatus)).toBe(true);
  });

  it.each(['active', 'discharged', 'deceased'])('accepts %s', (s) => {
    expect(isValidStatus(s)).toBe(true);
  });

  it.each(['Active', 'pending', 'deleted', ''])(
    'rejects invalid status: %s',
    (s) => {
      expect(isValidStatus(s)).toBe(false);
    },
  );
});

describe('LinkedRecordType validator', () => {
  it('accepts all valid record types', () => {
    expect(VALID_RECORD_TYPES.every(isValidRecordType)).toBe(true);
  });

  it.each([
    'medication', 'diagnosis', 'lab_result',
    'incident', 'care_plan', 'document', 'other',
  ])('accepts %s', (t) => {
    expect(isValidRecordType(t)).toBe(true);
  });

  it.each(['Medication', 'prescription', '', 'note'])(
    'rejects invalid record type: %s',
    (t) => {
      expect(isValidRecordType(t)).toBe(false);
    },
  );
});

// ── Seed residents ─────────────────────────────────────────────────────────

describe('buildSeedResidents()', () => {
  let residents: Resident[];

  beforeEach(() => {
    residents = buildSeedResidents();
  });

  it('returns exactly 3 working sample records', () => {
    expect(residents).toHaveLength(3);
  });

  it('all residents have the expected keys', () => {
    const requiredKeys: (keyof Resident)[] = [
      'id', 'facilityId', 'firstName', 'lastName',
      'dateOfBirth', 'gender', 'admissionDate', 'status',
      'createdAt', 'updatedAt',
    ];

    for (const resident of residents) {
      for (const key of requiredKeys) {
        expect(resident).toHaveProperty(key);
        expect(resident[key]).toBeTruthy();
      }
    }
  });

  it('all residents belong to the demo facility', () => {
    expect(residents.every((r) => r.facilityId === SEED_FACILITY_ID)).toBe(true);
  });

  it('all residents have a valid gender', () => {
    expect(residents.every((r) => isValidGender(r.gender))).toBe(true);
  });

  it('all residents have a valid status', () => {
    expect(residents.every((r) => isValidStatus(r.status))).toBe(true);
  });

  it('each resident has a unique ID', () => {
    const ids = residents.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('Ahmad Al-Rashid record has expected values', () => {
    const ahmad = residents.find((r) => r.firstName === 'Ahmad');
    expect(ahmad).toBeDefined();
    expect(ahmad!.lastName).toBe('Al-Rashid');
    expect(ahmad!.gender).toBe('male');
    expect(ahmad!.nationalId).toBe('1234567890');
    expect(ahmad!.roomNumber).toBe('101');
  });

  it('Fatimah Al-Zahrani record has expected values', () => {
    const fatimah = residents.find((r) => r.firstName === 'Fatimah');
    expect(fatimah).toBeDefined();
    expect(fatimah!.gender).toBe('female');
    expect(fatimah!.nationalId).toBe('0987654321');
  });

  it('Omar Al-Ghamdi (demo AI resident) is present with expected values', () => {
    const omar = residents.find((r) => r.firstName === 'Omar');
    expect(omar).toBeDefined();
    expect(omar!.id).toBe('a1b2c3d4-0000-0000-0000-000000000003');
    expect(omar!.status).toBe('active');
    expect(omar!.notes).toBeTruthy();
  });
});

// ── Seed family members ────────────────────────────────────────────────────

describe('buildSeedFamilyMembers()', () => {
  let members: FamilyMember[];

  beforeEach(() => {
    members = buildSeedFamilyMembers();
  });

  it('returns 3 family member records', () => {
    expect(members).toHaveLength(3);
  });

  it('all family members have the expected keys', () => {
    const requiredKeys: (keyof FamilyMember)[] = [
      'id', 'residentId', 'fullName', 'relationship', 'isPrimary',
      'createdAt', 'updatedAt',
    ];

    for (const member of members) {
      for (const key of requiredKeys) {
        expect(member).toHaveProperty(key);
      }
    }
  });

  it('each resident with family members has exactly one primary contact', () => {
    const byResident = new Map<string, FamilyMember[]>();
    for (const member of members) {
      const list = byResident.get(member.residentId) ?? [];
      list.push(member);
      byResident.set(member.residentId, list);
    }

    for (const [, familyList] of byResident) {
      const primaryCount = familyList.filter((m) => m.isPrimary).length;
      expect(primaryCount).toBe(1);
    }
  });

  it('all family members are linked to a seed resident', () => {
    const residentIds = buildSeedResidents().map((r) => r.id);
    for (const member of members) {
      expect(residentIds).toContain(member.residentId);
    }
  });

  it('Khalid Al-Rashid is the primary contact for Ahmad', () => {
    const khalid = members.find((m) => m.fullName === 'Khalid Al-Rashid');
    expect(khalid).toBeDefined();
    expect(khalid!.isPrimary).toBe(true);
    expect(khalid!.relationship).toBe('son');
    expect(khalid!.residentId).toBe('a1b2c3d4-0000-0000-0000-000000000001');
  });
});

// ── Seed linked records ────────────────────────────────────────────────────

describe('buildSeedLinkedRecords()', () => {
  let records: LinkedRecord[];

  beforeEach(() => {
    records = buildSeedLinkedRecords();
  });

  it('returns 3 linked record documents', () => {
    expect(records).toHaveLength(3);
  });

  it('all records have the expected keys', () => {
    const requiredKeys: (keyof LinkedRecord)[] = [
      'id', 'residentId', 'recordType', 'title',
      'recordedAt', 'createdAt', 'updatedAt',
    ];

    for (const rec of records) {
      for (const key of requiredKeys) {
        expect(rec).toHaveProperty(key);
        expect(rec[key]).toBeTruthy();
      }
    }
  });

  it('all record types are valid LinkedRecordType values', () => {
    expect(records.every((r) => isValidRecordType(r.recordType))).toBe(true);
  });

  it('all records are linked to a seed resident', () => {
    const residentIds = buildSeedResidents().map((r) => r.id);
    for (const rec of records) {
      expect(residentIds).toContain(rec.residentId);
    }
  });

  it('Ahmad has a medication record with drugs array', () => {
    const medRecord = records.find((r) => r.recordType === 'medication');
    expect(medRecord).toBeDefined();
    expect(medRecord!.content).toHaveProperty('drugs');
    expect(Array.isArray((medRecord!.content as { drugs: unknown[] }).drugs)).toBe(true);
  });

  it('Ahmad has a diagnosis record with ICD-10 codes', () => {
    const diagRecord = records.find((r) => r.recordType === 'diagnosis');
    expect(diagRecord).toBeDefined();
    expect(diagRecord!.content).toHaveProperty('icd10');
    expect(Array.isArray((diagRecord!.content as { icd10: unknown[] }).icd10)).toBe(true);
  });

  it('Fatimah has a care_plan record with goals', () => {
    const carePlan = records.find((r) => r.recordType === 'care_plan');
    expect(carePlan).toBeDefined();
    expect(carePlan!.content).toHaveProperty('goals');
  });
});
