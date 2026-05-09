/**
 * US-07-01 – KpiController unit tests
 *
 * Validates:
 *  - GET /kpi/dashboard – returns full KPI dashboard
 *  - Default days = 30
 *  - Custom days parameter parsed and clamped
 *  - All four KPI sections are present
 */

import { Test, TestingModule } from '@nestjs/testing';
import { KpiController } from './kpi.controller';
import { KpiService } from './kpi.service';
import { KpiDashboard } from './kpi.schema';

const FACILITY_ID = 'facility-test';

const mockDashboard: KpiDashboard = {
  facilityId: FACILITY_ID,
  generatedAt: '2025-05-08T12:00:00.000Z',
  period: { from: '2025-04-08', to: '2025-05-08', days: 30 },
  medicationAdherence: {
    totalDoses: 20,
    givenDoses: 14,
    missedDoses: 3,
    skippedDoses: 1,
    pendingDoses: 2,
    adherencePercentage: 70,
  },
  familyEngagement: {
    totalMediaItems: 3,
    confirmedMediaItems: 2,
    totalVisits: 3,
    approvedVisits: 1,
    completedVisits: 1,
    pendingVisits: 1,
  },
  criticalAlerts: {
    totalAlerts: 2,
    activeAlerts: 2,
    acknowledgedAlerts: 0,
    resolvedAlerts: 0,
    alertsByType: { heart_rate: 1, oxygen_saturation: 1 },
  },
  complaintClosure: {
    totalComplaints: 4,
    openComplaints: 1,
    inProgressComplaints: 1,
    resolvedComplaints: 1,
    closedComplaints: 1,
    closureRate: 50,
    avgResolutionHours: 36.5,
  },
};

const mockRequest = {
  user: {
    userId: 'admin-1',
    email: 'admin@test.sa',
    roles: ['Admin'],
    facilityId: FACILITY_ID,
  },
};

describe('KpiController', () => {
  let controller: KpiController;
  let service: jest.Mocked<KpiService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KpiController],
      providers: [
        {
          provide: KpiService,
          useValue: {
            getDashboard: jest.fn().mockResolvedValue(mockDashboard),
          },
        },
      ],
    }).compile();

    controller = module.get(KpiController);
    service = module.get(KpiService) as jest.Mocked<KpiService>;
  });

  describe('getDashboard()', () => {
    it('returns full KPI dashboard with default 30 days', async () => {
      const result = await controller.getDashboard(mockRequest);

      expect(service.getDashboard).toHaveBeenCalledWith(FACILITY_ID, 30);
      expect(result.facilityId).toBe(FACILITY_ID);
      expect(result.period.days).toBe(30);
    });

    it('parses custom days parameter', async () => {
      await controller.getDashboard(mockRequest, '7');

      expect(service.getDashboard).toHaveBeenCalledWith(FACILITY_ID, 7);
    });

    it('clamps days to at least 1', async () => {
      await controller.getDashboard(mockRequest, '0');

      expect(service.getDashboard).toHaveBeenCalledWith(FACILITY_ID, 1);
    });

    it('clamps days to at most 365', async () => {
      await controller.getDashboard(mockRequest, '999');

      expect(service.getDashboard).toHaveBeenCalledWith(FACILITY_ID, 365);
    });

    it('defaults to 30 for non-numeric input', async () => {
      await controller.getDashboard(mockRequest, 'abc');

      expect(service.getDashboard).toHaveBeenCalledWith(FACILITY_ID, 30);
    });

    it('includes all four KPI sections', async () => {
      const result = await controller.getDashboard(mockRequest);

      expect(result.medicationAdherence).toBeDefined();
      expect(result.medicationAdherence.adherencePercentage).toBe(70);
      expect(result.familyEngagement).toBeDefined();
      expect(result.familyEngagement.totalVisits).toBe(3);
      expect(result.criticalAlerts).toBeDefined();
      expect(result.criticalAlerts.activeAlerts).toBe(2);
      expect(result.complaintClosure).toBeDefined();
      expect(result.complaintClosure.closureRate).toBe(50);
    });
  });
});
