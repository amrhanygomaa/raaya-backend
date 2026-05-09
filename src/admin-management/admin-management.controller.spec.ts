import { Test, TestingModule } from '@nestjs/testing';
import { AdminManagementController } from './admin-management.controller';
import { AdminManagementService } from './admin-management.service';
import { FacilitySettings, ManagedUser } from './admin-management.schema';

const FACILITY_ID = 'facility-test';
const ADMIN_ID = 'admin-1';
const USER_ID = 'ad000000-0000-0000-0000-000000000001';

const mockUser: ManagedUser = {
  id: USER_ID,
  cognitoSub: 'cognito-sub-1',
  facilityId: FACILITY_ID,
  email: 'nurse@test.sa',
  fullName: 'Test Nurse',
  role: 'Nurse',
  status: 'active',
  createdBy: ADMIN_ID,
  createdAt: '2026-05-09T00:00:00.000Z',
  updatedAt: '2026-05-09T00:00:00.000Z',
};

const mockDisabledUser: ManagedUser = {
  ...mockUser,
  status: 'disabled',
  disabledBy: ADMIN_ID,
  disabledAt: '2026-05-09T01:00:00.000Z',
};

const mockSettings: FacilitySettings = {
  id: 'fs000000-0000-0000-0000-000000000001',
  facilityId: FACILITY_ID,
  medicationReminderMinutesBefore: 30,
  visitReminderHoursBefore: 24,
  alertPushEnabled: true,
  timezone: 'Asia/Riyadh',
  vitalThresholds: {
    heart_rate: { minValue: 60, maxValue: 100, unit: 'bpm' },
  },
  updatedBy: ADMIN_ID,
  createdAt: '2026-05-09T00:00:00.000Z',
  updatedAt: '2026-05-09T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: ADMIN_ID,
    email: 'admin@test.sa',
    roles: ['Admin'],
    facilityId: FACILITY_ID,
  },
};

describe('AdminManagementController', () => {
  let controller: AdminManagementController;
  let service: jest.Mocked<AdminManagementService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminManagementController],
      providers: [
        {
          provide: AdminManagementService,
          useValue: {
            createUser: jest.fn().mockResolvedValue(mockUser),
            findUsers: jest.fn().mockResolvedValue([mockUser]),
            disableUser: jest.fn().mockResolvedValue(mockDisabledUser),
            getSettings: jest.fn().mockResolvedValue(mockSettings),
            updateSettings: jest.fn().mockResolvedValue(mockSettings),
          },
        },
      ],
    }).compile();

    controller = module.get(AdminManagementController);
    service = module.get(AdminManagementService);
  });

  describe('createUser()', () => {
    it('passes facility and admin context to service', async () => {
      const dto = {
        email: 'nurse@test.sa',
        fullName: 'Test Nurse',
        role: 'Nurse',
        temporaryPassword: 'TempPass123!',
        suppressInvite: true,
      };

      const result = await controller.createUser(mockRequest, dto);

      expect(service.createUser).toHaveBeenCalledWith(
        FACILITY_ID,
        ADMIN_ID,
        dto,
      );
      expect(result.email).toBe(dto.email);
    });
  });

  describe('findUsers()', () => {
    it('passes filters to service', async () => {
      const result = await controller.findUsers(mockRequest, 'active', 'Nurse');

      expect(service.findUsers).toHaveBeenCalledWith(FACILITY_ID, {
        status: 'active',
        role: 'Nurse',
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('disableUser()', () => {
    it('disables user and returns audit fields', async () => {
      const result = await controller.disableUser(mockRequest, USER_ID);

      expect(service.disableUser).toHaveBeenCalledWith(
        FACILITY_ID,
        USER_ID,
        ADMIN_ID,
      );
      expect(result.status).toBe('disabled');
      expect(result.disabledBy).toBe(ADMIN_ID);
      expect(result.disabledAt).toBeDefined();
    });
  });

  describe('getSettings()', () => {
    it('returns facility settings', async () => {
      const result = await controller.getSettings(mockRequest);

      expect(service.getSettings).toHaveBeenCalledWith(FACILITY_ID);
      expect(result.facilityId).toBe(FACILITY_ID);
    });
  });

  describe('updateSettings()', () => {
    it('passes facility settings payload with admin context', async () => {
      const dto = {
        medicationReminderMinutesBefore: 45,
        visitReminderHoursBefore: 12,
        alertPushEnabled: false,
        timezone: 'Asia/Riyadh',
        vitalThresholds: {
          heart_rate: { minValue: 55, maxValue: 105, unit: 'bpm' },
        },
      };

      const result = await controller.updateSettings(mockRequest, dto);

      expect(service.updateSettings).toHaveBeenCalledWith(
        FACILITY_ID,
        ADMIN_ID,
        dto,
      );
      expect(result.vitalThresholds.heart_rate.unit).toBe('bpm');
    });
  });
});
