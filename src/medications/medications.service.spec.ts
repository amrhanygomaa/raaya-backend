/**
 * US-10-01 – MedicationsService unit tests
 *
 * Validates:
 *  - createSchedule() inserts with facility-scoped params
 *  - findAllSchedules() scopes by facilityId and supports filters
 *  - findOneSchedule() scopes by facilityId and throws NotFoundException
 *  - updateSchedule() builds dynamic SET, returns current row when empty dto
 *  - logDose() sets administered_by only when status is 'given'
 *  - updateDose() throws NotFoundException when not found
 *  - findDoseLogs() supports all filters
 *  - findOverdue() returns overdue doses with joined fields
 *  - getAdherenceReport() computes correct percentages and supports filters
 */

import { NotFoundException } from '@nestjs/common';
import { MedicationsService } from './medications.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { LogDoseDto } from './dto/log-dose.dto';
import { UpdateDoseDto } from './dto/update-dose.dto';

// ── Mock pg Pool ────────────────────────────────────────────────────────────

function makeMockPool() {
  return { query: jest.fn() };
}

const FACILITY_ID = 'facility-test';
const SCHEDULE_ID = 'd1000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const DOSE_ID = 'e1000000-0000-0000-0000-000000000001';
const USER_ID = 'nurse-user-1';

const scheduleRow = {
  id: SCHEDULE_ID,
  resident_id: RESIDENT_ID,
  facility_id: FACILITY_ID,
  medication_name: 'Aspirin 100mg',
  dosage: '1 tablet',
  route: 'oral',
  frequency: 'daily',
  scheduled_times: ['08:00'],
  start_date: new Date('2025-01-10'),
  end_date: null,
  is_active: true,
  prescriber: 'Dr. Sami',
  notes: 'Take with breakfast',
  created_at: new Date('2025-01-10T00:00:00Z'),
  updated_at: new Date('2025-01-10T00:00:00Z'),
};

const doseRow = {
  id: DOSE_ID,
  schedule_id: SCHEDULE_ID,
  resident_id: RESIDENT_ID,
  facility_id: FACILITY_ID,
  scheduled_time: new Date('2025-05-08T08:00:00Z'),
  status: 'given',
  administered_at: new Date('2025-05-08T08:05:00Z'),
  administered_by: USER_ID,
  notes: null,
  created_at: new Date('2025-05-08T08:05:00Z'),
  updated_at: new Date('2025-05-08T08:05:00Z'),
};

const overdueRow = {
  ...doseRow,
  status: 'pending',
  administered_at: null,
  administered_by: null,
  medication_name: 'Aspirin 100mg',
  dosage: '1 tablet',
  first_name: 'Ahmad',
  last_name: 'Al-Rashid',
  room_number: '101',
};

describe('MedicationsService', () => {
  let service: MedicationsService;
  let pool: ReturnType<typeof makeMockPool>;

  beforeEach(() => {
    pool = makeMockPool();
    service = new MedicationsService(pool as any);
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  SCHEDULE CRUD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('createSchedule()', () => {
    it('inserts a schedule with the injected facilityId', async () => {
      pool.query.mockResolvedValueOnce({ rows: [scheduleRow], rowCount: 1 });

      const dto: CreateScheduleDto = {
        residentId: RESIDENT_ID,
        medicationName: 'Aspirin 100mg',
        dosage: '1 tablet',
      };

      const result = await service.createSchedule(FACILITY_ID, dto);

      expect(pool.query).toHaveBeenCalledTimes(1);
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO medication_schedules');
      expect(params[0]).toBe(RESIDENT_ID);
      expect(params[1]).toBe(FACILITY_ID);
      expect(result.id).toBe(SCHEDULE_ID);
      expect(result.facilityId).toBe(FACILITY_ID);
      expect(result.medicationName).toBe('Aspirin 100mg');
    });
  });

  describe('findAllSchedules()', () => {
    it('queries by facilityId only when no filters', async () => {
      pool.query.mockResolvedValueOnce({ rows: [scheduleRow], rowCount: 1 });

      const results = await service.findAllSchedules(FACILITY_ID);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('facility_id = $1');
      expect(params).toEqual([FACILITY_ID]);
      expect(results).toHaveLength(1);
    });

    it('adds residentId filter when provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findAllSchedules(FACILITY_ID, { residentId: RESIDENT_ID });

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('resident_id = $2');
      expect(params).toEqual([FACILITY_ID, RESIDENT_ID]);
    });

    it('adds active filter when provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findAllSchedules(FACILITY_ID, { active: true });

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('is_active = $2');
      expect(params).toEqual([FACILITY_ID, true]);
    });

    it('combines residentId and active filters', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findAllSchedules(FACILITY_ID, {
        residentId: RESIDENT_ID,
        active: false,
      });

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('resident_id = $2');
      expect(sql).toContain('is_active = $3');
      expect(params).toEqual([FACILITY_ID, RESIDENT_ID, false]);
    });
  });

  describe('findOneSchedule()', () => {
    it('returns schedule when found in the same facility', async () => {
      pool.query.mockResolvedValueOnce({ rows: [scheduleRow], rowCount: 1 });

      const result = await service.findOneSchedule(FACILITY_ID, SCHEDULE_ID);

      expect(result.id).toBe(SCHEDULE_ID);
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('facility_id = $2');
      expect(params).toEqual([SCHEDULE_ID, FACILITY_ID]);
    });

    it('throws NotFoundException when schedule does not exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.findOneSchedule(FACILITY_ID, 'non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateSchedule()', () => {
    it('builds dynamic SET with only provided fields', async () => {
      const updatedRow = { ...scheduleRow, dosage: '2 tablets' };
      pool.query.mockResolvedValueOnce({ rows: [updatedRow], rowCount: 1 });

      const dto: UpdateScheduleDto = { dosage: '2 tablets' };
      const result = await service.updateSchedule(
        FACILITY_ID,
        SCHEDULE_ID,
        dto,
      );

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('UPDATE medication_schedules');
      expect(sql).toContain('dosage = $1');
      expect(params).toContain('2 tablets');
      expect(params).toContain(SCHEDULE_ID);
      expect(params).toContain(FACILITY_ID);
      expect(result.dosage).toBe('2 tablets');
    });

    it('returns current record when no fields are provided', async () => {
      pool.query.mockResolvedValueOnce({ rows: [scheduleRow], rowCount: 1 });

      const result = await service.updateSchedule(FACILITY_ID, SCHEDULE_ID, {});

      const [sql] = pool.query.mock.calls[0];
      expect(sql).toContain('SELECT');
      expect(result.id).toBe(SCHEDULE_ID);
    });

    it('throws NotFoundException when schedule not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.updateSchedule(FACILITY_ID, 'non-existent', {
          dosage: '3 tablets',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  DOSE LOGGING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('logDose()', () => {
    it('sets administered_by to userId when status is given', async () => {
      pool.query.mockResolvedValueOnce({ rows: [doseRow], rowCount: 1 });

      const dto: LogDoseDto = {
        scheduleId: SCHEDULE_ID,
        residentId: RESIDENT_ID,
        scheduledTime: '2025-05-08T08:00:00.000Z',
        status: 'given',
      };

      const result = await service.logDose(FACILITY_ID, USER_ID, dto);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO dose_logs');
      expect(params[2]).toBe(FACILITY_ID);
      expect(params[6]).toBe(USER_ID); // administered_by
      expect(result.id).toBe(DOSE_ID);
    });

    it('sets administered_by to null when status is not given', async () => {
      const pendingRow = {
        ...doseRow,
        status: 'pending',
        administered_by: null,
      };
      pool.query.mockResolvedValueOnce({ rows: [pendingRow], rowCount: 1 });

      const dto: LogDoseDto = {
        scheduleId: SCHEDULE_ID,
        residentId: RESIDENT_ID,
        scheduledTime: '2025-05-08T08:00:00.000Z',
        status: 'pending',
      };

      await service.logDose(FACILITY_ID, USER_ID, dto);

      const [, params] = pool.query.mock.calls[0];
      expect(params[6]).toBeNull(); // administered_by
    });
  });

  describe('updateDose()', () => {
    it('updates a dose and returns the result', async () => {
      pool.query.mockResolvedValueOnce({ rows: [doseRow], rowCount: 1 });

      const dto: UpdateDoseDto = { status: 'given' };
      const result = await service.updateDose(
        FACILITY_ID,
        DOSE_ID,
        USER_ID,
        dto,
      );

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('UPDATE dose_logs');
      expect(params[4]).toBe(DOSE_ID);
      expect(params[5]).toBe(FACILITY_ID);
      expect(result.id).toBe(DOSE_ID);
    });

    it('throws NotFoundException when dose not found', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await expect(
        service.updateDose(FACILITY_ID, 'non-existent', USER_ID, {
          status: 'given',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('sets administered_by to null when status is not given', async () => {
      const skippedRow = {
        ...doseRow,
        status: 'skipped',
        administered_by: null,
      };
      pool.query.mockResolvedValueOnce({ rows: [skippedRow], rowCount: 1 });

      await service.updateDose(FACILITY_ID, DOSE_ID, USER_ID, {
        status: 'skipped',
      });

      const [, params] = pool.query.mock.calls[0];
      expect(params[2]).toBeNull(); // administered_by
    });
  });

  describe('findDoseLogs()', () => {
    it('queries by facilityId only when no filters', async () => {
      pool.query.mockResolvedValueOnce({ rows: [doseRow], rowCount: 1 });

      const results = await service.findDoseLogs(FACILITY_ID);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('facility_id = $1');
      expect(params).toEqual([FACILITY_ID]);
      expect(results).toHaveLength(1);
    });

    it('supports all filters combined', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.findDoseLogs(FACILITY_ID, {
        residentId: RESIDENT_ID,
        scheduleId: SCHEDULE_ID,
        status: 'pending',
      });

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('resident_id = $2');
      expect(sql).toContain('schedule_id = $3');
      expect(sql).toContain('status = $4');
      expect(params).toEqual([
        FACILITY_ID,
        RESIDENT_ID,
        SCHEDULE_ID,
        'pending',
      ]);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  OVERDUE QUERY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('findOverdue()', () => {
    it('returns overdue doses with joined resident/medication fields', async () => {
      pool.query.mockResolvedValueOnce({ rows: [overdueRow], rowCount: 1 });

      const results = await service.findOverdue(FACILITY_ID);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('JOIN medication_schedules');
      expect(sql).toContain('JOIN residents');
      expect(sql).toContain("dl.status = 'pending'");
      expect(params).toEqual([FACILITY_ID]);
      expect(results).toHaveLength(1);
      expect(results[0].medicationName).toBe('Aspirin 100mg');
      expect(results[0].residentFirstName).toBe('Ahmad');
      expect(results[0].roomNumber).toBe('101');
    });

    it('returns empty array when no overdue doses', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const results = await service.findOverdue(FACILITY_ID);

      expect(results).toEqual([]);
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ADHERENCE REPORTING (US-04-05)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('getAdherenceReport()', () => {
    const adherenceRow = {
      resident_id: RESIDENT_ID,
      first_name: 'Ahmad',
      last_name: 'Al-Rashid',
      room_number: '101',
      total_doses: 10,
      given_doses: 8,
    };

    it('computes correct adherence percentages', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [adherenceRow],
        rowCount: 1,
      });

      const report = await service.getAdherenceReport(FACILITY_ID, 'weekly');

      expect(report.period).toBe('weekly');
      expect(report.facilityId).toBe(FACILITY_ID);
      expect(report.facilityAdherence.totalDoses).toBe(10);
      expect(report.facilityAdherence.givenDoses).toBe(8);
      expect(report.facilityAdherence.percentage).toBe(80);
      expect(report.residents).toHaveLength(1);
      expect(report.residents[0].percentage).toBe(80);
    });

    it('returns 0% when no doses exist', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      const report = await service.getAdherenceReport(FACILITY_ID, 'weekly');

      expect(report.facilityAdherence.totalDoses).toBe(0);
      expect(report.facilityAdherence.percentage).toBe(0);
      expect(report.residents).toEqual([]);
    });

    it('uses 30-day window for monthly period', async () => {
      pool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      await service.getAdherenceReport(FACILITY_ID, 'monthly');

      const [sql] = pool.query.mock.calls[0];
      expect(sql).toContain('dl.scheduled_time >= $2');
      expect(sql).toContain('dl.scheduled_time <= $3');
    });

    it('adds residentId filter when provided', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [adherenceRow],
        rowCount: 1,
      });

      await service.getAdherenceReport(FACILITY_ID, 'weekly', RESIDENT_ID);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('dl.resident_id = $4');
      expect(params[3]).toBe(RESIDENT_ID);
    });

    it('handles two-decimal precision in percentage', async () => {
      const precisionRow = { ...adherenceRow, total_doses: 3, given_doses: 1 };
      pool.query.mockResolvedValueOnce({
        rows: [precisionRow],
        rowCount: 1,
      });

      const report = await service.getAdherenceReport(FACILITY_ID, 'weekly');

      // 1/3 = 33.33%
      expect(report.residents[0].percentage).toBe(33.33);
      expect(report.facilityAdherence.percentage).toBe(33.33);
    });
  });
});
