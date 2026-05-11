/**
 * US-12-03 – HandoffsController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HandoffsController } from './handoffs.controller';
import { HandoffsService } from './handoffs.service';
import { ShiftHandoff } from './handoffs.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-1';
const HANDOFF_ID = 'ho000000-0000-0000-0000-000000000001';

const mockHandoff: ShiftHandoff = {
  id: HANDOFF_ID,
  facilityId: FACILITY_ID,
  outgoingNurseId: USER_ID,
  incomingNurseId: 'nurse-2',
  shiftDate: '2025-05-10',
  shiftType: 'morning',
  summary: 'All residents stable.',
  residentsCovered: ['a1b2c3d4-0000-0000-0000-000000000001'],
  pendingTasks: [{ task: 'BP check for Ahmad', due: '14:00' }],
  createdAt: '2025-05-10T07:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

describe('HandoffsController', () => {
  let controller: HandoffsController;
  let service: jest.Mocked<HandoffsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HandoffsController],
      providers: [
        {
          provide: HandoffsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockHandoff),
            findAll: jest.fn().mockResolvedValue([mockHandoff]),
            findOne: jest.fn().mockResolvedValue(mockHandoff),
          },
        },
      ],
    }).compile();

    controller = module.get(HandoffsController);
    service = module.get(HandoffsService);
  });

  describe('create()', () => {
    it('creates a shift handoff', async () => {
      const dto = {
        incomingNurseId: 'nurse-2',
        shiftDate: '2025-05-10',
        shiftType: 'morning',
        summary: 'All residents stable.',
        residentsCovered: ['a1b2c3d4-0000-0000-0000-000000000001'],
        pendingTasks: [{ task: 'BP check for Ahmad', due: '14:00' }],
      };

      const result = await controller.create(mockRequest, dto);

      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, USER_ID, dto);
      expect(result.id).toBe(HANDOFF_ID);
    });
  });

  describe('findAll()', () => {
    it('returns handoffs list for facility', async () => {
      const result = await controller.findAll(mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        date: undefined,
        nurseId: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes filters to service', async () => {
      await controller.findAll(mockRequest, '2025-05-10', USER_ID);

      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        date: '2025-05-10',
        nurseId: USER_ID,
      });
    });
  });

  describe('findOne()', () => {
    it('returns single handoff', async () => {
      const result = await controller.findOne(mockRequest, HANDOFF_ID);

      expect(service.findOne).toHaveBeenCalledWith(FACILITY_ID, HANDOFF_ID);
      expect(result.id).toBe(HANDOFF_ID);
    });
  });
});
