/**
 * US-04-01 – MedicationsController unit tests
 *
 * Validates:
 *  - POST /medications/schedules passes facilityId from JWT
 *  - GET /medications/schedules lists schedules with filters
 *  - GET /medications/schedules/:id returns a single schedule
 *  - PATCH /medications/schedules/:id updates a schedule
 *  - POST /medications/doses logs a dose with userId from JWT
 *  - GET /medications/doses lists dose logs with filters
 *  - PATCH /medications/doses/:id updates a dose log
 *  - GET /medications/overdue returns overdue doses
 *  - GET /medications/adherence returns adherence report (US-04-05)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { MedicationSchedule, DoseLog, OverdueDose } from './medications.schema';
import { RealtimeGateway } from '../gateway/realtime.gateway';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-user-1';
const SCHEDULE_ID = 'd1000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const DOSE_ID = 'e1000000-0000-0000-0000-000000000001';

const mockSchedule: MedicationSchedule = {
  id: SCHEDULE_ID,
  residentId: RESIDENT_ID,
  facilityId: FACILITY_ID,
  medicationName: 'Aspirin 100mg',
  dosage: '1 tablet',
  route: 'oral',
  frequency: 'daily',
  scheduledTimes: ['08:00'],
  startDate: '2025-01-10',
  isActive: true,
  prescriber: 'Dr. Sami',
  notes: 'Take with breakfast',
  createdAt: '2025-01-10T00:00:00.000Z',
  updatedAt: '2025-01-10T00:00:00.000Z',
};

const mockDoseLog: DoseLog = {
  id: DOSE_ID,
  scheduleId: SCHEDULE_ID,
  residentId: RESIDENT_ID,
  facilityId: FACILITY_ID,
  scheduledTime: '2025-05-08T08:00:00.000Z',
  status: 'given',
  administeredAt: '2025-05-08T08:05:00.000Z',
  administeredBy: USER_ID,
  createdAt: '2025-05-08T08:05:00.000Z',
  updatedAt: '2025-05-08T08:05:00.000Z',
};

const mockOverdue: OverdueDose = {
  ...mockDoseLog,
  status: 'pending',
  administeredAt: undefined,
  administeredBy: undefined,
  medicationName: 'Aspirin 100mg',
  dosage: '1 tablet',
  residentFirstName: 'Ahmad',
  residentLastName: 'Al-Rashid',
  roomNumber: '101',
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

describe('MedicationsController', () => {
  let controller: MedicationsController;
  let service: jest.Mocked<MedicationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicationsController],
      providers: [
        {
          provide: MedicationsService,
          useValue: {
            createSchedule: jest.fn().mockResolvedValue(mockSchedule),
            findAllSchedules: jest.fn().mockResolvedValue([mockSchedule]),
            findOneSchedule: jest.fn().mockResolvedValue(mockSchedule),
            updateSchedule: jest.fn().mockResolvedValue(mockSchedule),
            logDose: jest.fn().mockResolvedValue(mockDoseLog),
            findDoseLogs: jest.fn().mockResolvedValue([mockDoseLog]),
            updateDose: jest.fn().mockResolvedValue(mockDoseLog),
            findOverdue: jest.fn().mockResolvedValue([mockOverdue]),
            getAdherenceReport: jest.fn().mockResolvedValue({
              period: 'weekly',
              from: '2025-05-01',
              to: '2025-05-08',
              facilityId: FACILITY_ID,
              facilityAdherence: {
                totalDoses: 4,
                givenDoses: 2,
                percentage: 50,
              },
              residents: [
                {
                  residentId: RESIDENT_ID,
                  residentFirstName: 'Ahmad',
                  residentLastName: 'Al-Rashid',
                  roomNumber: '101',
                  totalDoses: 4,
                  givenDoses: 2,
                  percentage: 50,
                },
              ],
            }),
          },
        },
        {
          provide: RealtimeGateway,
          useValue: {
            broadcastLiveEvent: jest.fn(),
            broadcastKpiRefresh: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(MedicationsController);
    service = module.get(MedicationsService);
  });

  // ── SCHEDULE CRUD ─────────────────────────────────────────────────────

  describe('createSchedule()', () => {
    it('passes facilityId from JWT to service', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        medicationName: 'Aspirin 100mg',
        dosage: '1 tablet',
      };

      const result = await controller.createSchedule(mockRequest, dto);

      expect(service.createSchedule).toHaveBeenCalledWith(FACILITY_ID, dto);
      expect(result.id).toBe(SCHEDULE_ID);
    });
  });

  describe('findAllSchedules()', () => {
    it("returns schedules for the caller's facility", async () => {
      const result = await controller.findAllSchedules(mockRequest);

      expect(service.findAllSchedules).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        active: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes residentId filter', async () => {
      await controller.findAllSchedules(mockRequest, RESIDENT_ID);

      expect(service.findAllSchedules).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: RESIDENT_ID,
        active: undefined,
      });
    });

    it('converts active string to boolean', async () => {
      await controller.findAllSchedules(mockRequest, undefined, 'true');

      expect(service.findAllSchedules).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        active: true,
      });
    });
  });

  describe('findOneSchedule()', () => {
    it('uses facilityId from JWT for scoping', async () => {
      const result = await controller.findOneSchedule(mockRequest, SCHEDULE_ID);

      expect(service.findOneSchedule).toHaveBeenCalledWith(
        FACILITY_ID,
        SCHEDULE_ID,
      );
      expect(result.id).toBe(SCHEDULE_ID);
    });
  });

  describe('updateSchedule()', () => {
    it('passes facilityId and scheduleId to service', async () => {
      const dto = { dosage: '2 tablets' };

      const result = await controller.updateSchedule(
        mockRequest,
        SCHEDULE_ID,
        dto,
      );

      expect(service.updateSchedule).toHaveBeenCalledWith(
        FACILITY_ID,
        SCHEDULE_ID,
        dto,
      );
      expect(result.id).toBe(SCHEDULE_ID);
    });
  });

  // ── DOSE LOGGING ──────────────────────────────────────────────────────

  describe('logDose()', () => {
    it('passes facilityId and userId from JWT', async () => {
      const dto = {
        scheduleId: SCHEDULE_ID,
        residentId: RESIDENT_ID,
        scheduledTime: '2025-05-08T08:00:00.000Z',
        status: 'given',
      };

      const result = await controller.logDose(mockRequest, dto);

      expect(service.logDose).toHaveBeenCalledWith(FACILITY_ID, USER_ID, dto);
      expect(result.id).toBe(DOSE_ID);
    });
  });

  describe('findDoseLogs()', () => {
    it("returns dose logs for the caller's facility", async () => {
      const result = await controller.findDoseLogs(mockRequest);

      expect(service.findDoseLogs).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        scheduleId: undefined,
        status: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes all filters to the service', async () => {
      await controller.findDoseLogs(
        mockRequest,
        RESIDENT_ID,
        SCHEDULE_ID,
        'pending',
      );

      expect(service.findDoseLogs).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: RESIDENT_ID,
        scheduleId: SCHEDULE_ID,
        status: 'pending',
      });
    });
  });

  describe('updateDose()', () => {
    it('passes facilityId, doseId and userId from JWT', async () => {
      const dto = { status: 'given' };

      const result = await controller.updateDose(mockRequest, DOSE_ID, dto);

      expect(service.updateDose).toHaveBeenCalledWith(
        FACILITY_ID,
        DOSE_ID,
        USER_ID,
        dto,
      );
      expect(result.id).toBe(DOSE_ID);
    });
  });

  // ── OVERDUE QUERY ─────────────────────────────────────────────────────

  describe('findOverdue()', () => {
    it("returns overdue doses for the caller's facility", async () => {
      const result = await controller.findOverdue(mockRequest);

      expect(service.findOverdue).toHaveBeenCalledWith(FACILITY_ID);
      expect(result).toHaveLength(1);
      expect(result[0].medicationName).toBe('Aspirin 100mg');
      expect(result[0].residentFirstName).toBe('Ahmad');
    });
  });

  // ── ADHERENCE REPORTING (US-04-05) ────────────────────────────────────

  describe('getAdherenceReport()', () => {
    it('defaults to weekly when no period is provided', async () => {
      const result = await controller.getAdherenceReport(mockRequest);

      expect(service.getAdherenceReport).toHaveBeenCalledWith(
        FACILITY_ID,
        'weekly',
        undefined,
      );
      expect(result.period).toBe('weekly');
      expect(result.facilityAdherence.percentage).toBe(50);
    });

    it('passes monthly period to service', async () => {
      await controller.getAdherenceReport(mockRequest, 'monthly');

      expect(service.getAdherenceReport).toHaveBeenCalledWith(
        FACILITY_ID,
        'monthly',
        undefined,
      );
    });

    it('falls back to weekly for invalid period values', async () => {
      await controller.getAdherenceReport(mockRequest, 'yearly');

      expect(service.getAdherenceReport).toHaveBeenCalledWith(
        FACILITY_ID,
        'weekly',
        undefined,
      );
    });

    it('passes residentId filter to service', async () => {
      await controller.getAdherenceReport(mockRequest, 'weekly', RESIDENT_ID);

      expect(service.getAdherenceReport).toHaveBeenCalledWith(
        FACILITY_ID,
        'weekly',
        RESIDENT_ID,
      );
    });

    it('returns residents breakdown in the report', async () => {
      const result = await controller.getAdherenceReport(mockRequest);

      expect(result.residents).toHaveLength(1);
      expect(result.residents[0].residentFirstName).toBe('Ahmad');
      expect(result.residents[0].percentage).toBe(50);
    });
  });
});
