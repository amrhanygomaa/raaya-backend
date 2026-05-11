/**
 * US-13-03 – MedicalSessionsController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MedicalSessionsController } from './medical-sessions.controller';
import { MedicalSessionsService } from './medical-sessions.service';
import { MedicalSession } from './medical-sessions.schema';

const FACILITY_ID = 'facility-test';
const SESSION_ID = 'ms000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockSession: MedicalSession = {
  id: SESSION_ID,
  facilityId: FACILITY_ID,
  residentId: RESIDENT_ID,
  type: 'doctor',
  specialistName: 'Dr. Sami',
  sessionDate: '2025-05-12',
  sessionTime: '10:00',
  notes: 'Routine follow-up',
  createdAt: '2025-05-12T10:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: 'nurse-1',
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

describe('MedicalSessionsController', () => {
  let controller: MedicalSessionsController;
  let service: jest.Mocked<MedicalSessionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicalSessionsController],
      providers: [
        {
          provide: MedicalSessionsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockSession),
            findAll: jest.fn().mockResolvedValue([mockSession]),
          },
        },
      ],
    }).compile();

    controller = module.get(MedicalSessionsController);
    service = module.get(MedicalSessionsService);
  });

  describe('create()', () => {
    it('logs a medical session', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        sessionDate: '2025-05-12',
      };
      const result = await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, dto);
      expect(result.id).toBe(SESSION_ID);
    });
  });

  describe('findAll()', () => {
    it('returns sessions list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        type: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes filters to service', async () => {
      await controller.findAll(mockRequest, RESIDENT_ID, 'pt');
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: RESIDENT_ID,
        type: 'pt',
      });
    });
  });
});
