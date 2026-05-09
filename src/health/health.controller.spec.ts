/**
 * US-06-01 – HealthController unit tests
 *
 * Validates:
 *  - POST /health/vitals – record vitals, returns alerts
 *  - GET /health/vitals – list vitals with filters
 *  - GET /health/alerts – list alerts with filters
 *  - PATCH /health/alerts/:id – acknowledge / resolve alert
 *  - GET /health/thresholds – list thresholds
 *  - PUT /health/thresholds – upsert threshold (Admin)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import {
  VitalSign,
  VitalAlert,
  VitalThreshold,
  RecordVitalsResult,
} from './health.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-1';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const VITAL_ID = 'vs000000-0000-0000-0000-000000000001';
const ALERT_ID = 'va000000-0000-0000-0000-000000000001';
const THRESHOLD_ID = 'th000000-0000-0000-0000-000000000001';

const mockVitalSign: VitalSign = {
  id: VITAL_ID,
  residentId: RESIDENT_ID,
  facilityId: FACILITY_ID,
  recordedBy: USER_ID,
  recordedAt: '2025-05-08T08:00:00.000Z',
  heartRate: 72,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  temperature: 36.8,
  respiratoryRate: 16,
  oxygenSaturation: 98,
  bloodGlucose: 95,
  createdAt: '2025-05-08T08:00:00.000Z',
  updatedAt: '2025-05-08T08:00:00.000Z',
};

const mockAlert: VitalAlert = {
  id: ALERT_ID,
  vitalSignId: VITAL_ID,
  residentId: RESIDENT_ID,
  facilityId: FACILITY_ID,
  vitalType: 'heart_rate',
  recordedValue: 110,
  thresholdMin: 60,
  thresholdMax: 100,
  severity: 'warning',
  status: 'active',
  createdAt: '2025-05-08T08:00:00.000Z',
  updatedAt: '2025-05-08T08:00:00.000Z',
};

const mockThreshold: VitalThreshold = {
  id: THRESHOLD_ID,
  facilityId: FACILITY_ID,
  vitalType: 'heart_rate',
  minValue: 60,
  maxValue: 100,
  unit: 'bpm',
  createdAt: '2025-05-08T00:00:00.000Z',
  updatedAt: '2025-05-08T00:00:00.000Z',
};

const mockRecordResult: RecordVitalsResult = {
  vitalSign: mockVitalSign,
  alerts: [],
};

const mockRecordResultWithAlert: RecordVitalsResult = {
  vitalSign: { ...mockVitalSign, heartRate: 110 },
  alerts: [mockAlert],
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

const mockAdminRequest = {
  user: {
    userId: 'admin-1',
    email: 'admin@test.sa',
    roles: ['Admin'],
    facilityId: FACILITY_ID,
  },
};

describe('HealthController', () => {
  let controller: HealthController;
  let service: jest.Mocked<HealthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            recordVitals: jest.fn().mockResolvedValue(mockRecordResult),
            findVitals: jest.fn().mockResolvedValue([mockVitalSign]),
            findAlerts: jest.fn().mockResolvedValue([mockAlert]),
            updateAlert: jest
              .fn()
              .mockResolvedValue({ ...mockAlert, status: 'acknowledged' }),
            findThresholds: jest.fn().mockResolvedValue([mockThreshold]),
            upsertThreshold: jest.fn().mockResolvedValue(mockThreshold),
          },
        },
      ],
    }).compile();

    controller = module.get(HealthController);
    service = module.get(HealthService);
  });

  // ── VITALS ────────────────────────────────────────────────────────────

  describe('recordVitals()', () => {
    it('records vitals and returns result with empty alerts when in range', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        heartRate: 72,
        bloodPressureSystolic: 120,
        bloodPressureDiastolic: 80,
        temperature: 36.8,
      };

      const result = await controller.recordVitals(mockRequest, dto);

      expect(service.recordVitals).toHaveBeenCalledWith(
        FACILITY_ID,
        USER_ID,
        dto,
      );
      expect(result.vitalSign.id).toBe(VITAL_ID);
      expect(result.alerts).toHaveLength(0);
    });

    it('returns alerts when values are out of range', async () => {
      service.recordVitals.mockResolvedValueOnce(mockRecordResultWithAlert);

      const dto = {
        residentId: RESIDENT_ID,
        heartRate: 110,
      };

      const result = await controller.recordVitals(mockRequest, dto);

      expect(result.alerts).toHaveLength(1);
      expect(result.alerts[0].vitalType).toBe('heart_rate');
      expect(result.alerts[0].recordedValue).toBe(110);
    });
  });

  describe('findVitals()', () => {
    it('returns vitals for the facility', async () => {
      const result = await controller.findVitals(mockRequest);

      expect(service.findVitals).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes residentId filter', async () => {
      await controller.findVitals(mockRequest, RESIDENT_ID);

      expect(service.findVitals).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: RESIDENT_ID,
      });
    });
  });

  // ── ALERTS ────────────────────────────────────────────────────────────

  describe('findAlerts()', () => {
    it('returns alerts for the facility', async () => {
      const result = await controller.findAlerts(mockRequest);

      expect(service.findAlerts).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        status: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes filters to service', async () => {
      await controller.findAlerts(mockRequest, RESIDENT_ID, 'active');

      expect(service.findAlerts).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: RESIDENT_ID,
        status: 'active',
      });
    });
  });

  describe('updateAlert()', () => {
    it('acknowledges an alert and passes userId', async () => {
      const dto = { status: 'acknowledged' };

      const result = await controller.updateAlert(mockRequest, ALERT_ID, dto);

      expect(service.updateAlert).toHaveBeenCalledWith(
        FACILITY_ID,
        ALERT_ID,
        USER_ID,
        dto,
      );
      expect(result.status).toBe('acknowledged');
    });
  });

  // ── THRESHOLDS ────────────────────────────────────────────────────────

  describe('findThresholds()', () => {
    it('returns thresholds for the facility', async () => {
      const result = await controller.findThresholds(mockRequest);

      expect(service.findThresholds).toHaveBeenCalledWith(FACILITY_ID);
      expect(result).toHaveLength(1);
      expect(result[0].vitalType).toBe('heart_rate');
    });
  });

  describe('upsertThreshold()', () => {
    it('upserts a threshold', async () => {
      const dto = {
        vitalType: 'heart_rate',
        minValue: 60,
        maxValue: 100,
        unit: 'bpm',
      };

      const result = await controller.upsertThreshold(mockAdminRequest, dto);

      expect(service.upsertThreshold).toHaveBeenCalledWith(FACILITY_ID, dto);
      expect(result.vitalType).toBe('heart_rate');
    });
  });
});
