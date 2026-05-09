/**
 * US-03-02 – ResidentsService unit tests
 *
 * Validates:
 *  - create() inserts with the correct facilityId
 *  - findAll() scopes by facilityId and supports status filter
 *  - findOne() scopes by facilityId and throws NotFoundException
 *  - update() builds dynamic SET and scopes by facilityId
 */

import { NotFoundException } from '@nestjs/common';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';

// ── Mock pg Pool ────────────────────────────────────────────────────────────

function makeMockPool() {
  return {
    query: jest.fn(),
  };
}

const FACILITY_ID = 'facility-test';
const RESIDENT_ID = '11111111-1111-1111-1111-111111111111';

const dbRow = {
  id: RESIDENT_ID,
  facility_id: FACILITY_ID,
  first_name: 'Ahmad',
  last_name: 'Al-Rashid',
  date_of_birth: new Date('1940-03-15'),
  gender: 'male',
  national_id: '1234567890',
  room_number: '101',
  admission_date: new Date('2025-01-10'),
  discharge_date: null,
  status: 'active',
  notes: null,
  created_at: new Date('2025-01-10T00:00:00Z'),
  updated_at: new Date('2025-01-10T00:00:00Z'),
};

describe('ResidentsService', () => {
  let service: ResidentsService;
  let pool: ReturnType<typeof makeMockPool>;

  beforeEach(() => {
    pool = makeMockPool();
    service = new ResidentsService(pool as any);
  });

  // ── create ──────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('inserts a resident with the injected facilityId', async () => {
      pool.query.mockResolvedValueOnce({ rows: [dbRow], rowCount: 1 });

      const dto: CreateResidentDto = {
        firstName: 'Ahmad',
        lastName: 'Al-Rashid',
        dateOfBirth: '1940-03-15',
        gender: 'male',
        admissionDate: '2025-01-10',
      };

      const result = await service.create(FACILITY_ID, dto);

      // Pool.query should have been called with facilityId as the 1st param
      expect(pool.query).toHaveBeenCalledTimes(1);
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO residents');
      expect(params[0]).toBe(FACILITY_ID);

      // Returned object should be camelCase
      expect(result.id).toBe(RESIDENT_ID);
      expect(result.facilityId).toBe(FACILITY_ID);
      expect(result.firstName).toBe('Ahmad');
    });
  });

  // ── findAll ─────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('queries by facilityId only when no status filter', async () => {
      pool.query.mockResolvedValueOnce({ rows: [dbRow], rowCount: 1 });

      const results = await service.findAll(FACILITY_ID);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('facility_id = $1');
      expect(params).toEqual([FACILITY_ID]);
      expect(results).toHaveLength(1);
    });

    it('adds status filter when provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findAll(FACILITY_ID, { status: 'discharged' });

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('status = $2');
      expect(params).toEqual([FACILITY_ID, 'discharged']);
    });
  });

  // ── findOne ─────────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns resident when found in the same facility', async () => {
      pool.query.mockResolvedValueOnce({ rows: [dbRow], rowCount: 1 });

      const result = await service.findOne(FACILITY_ID, RESIDENT_ID);
      expect(result.id).toBe(RESIDENT_ID);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('facility_id = $2');
      expect(params).toEqual([RESIDENT_ID, FACILITY_ID]);
    });

    it('throws NotFoundException when resident does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.findOne(FACILITY_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException for cross-facility access attempt', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.findOne('other-facility', RESIDENT_ID),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ──────────────────────────────────────────────────────────────

  describe('update()', () => {
    it('builds dynamic SET with only provided fields', async () => {
      const updatedRow = { ...dbRow, room_number: '202' };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const dto: UpdateResidentDto = { roomNumber: '202' };
      const result = await service.update(FACILITY_ID, RESIDENT_ID, dto);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('UPDATE residents');
      expect(sql).toContain('room_number = $1');
      expect(params).toContain('202');
      expect(params).toContain(RESIDENT_ID);
      expect(params).toContain(FACILITY_ID);
      expect(result.roomNumber).toBe('202');
    });

    it('returns current record when no fields are provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [dbRow], rowCount: 1 });

      const result = await service.update(FACILITY_ID, RESIDENT_ID, {});
      // Should have called findOne (SELECT) instead of UPDATE
      const [sql] = pool.query.mock.calls[0];
      expect(sql).toContain('SELECT');
      expect(result.id).toBe(RESIDENT_ID);
    });

    it('throws NotFoundException when resident not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.update(FACILITY_ID, 'non-existent', { status: 'discharged' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
