/**
 * US-12-05 – CareTasksController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { CareTasksController } from './care-tasks.controller';
import { CareTasksService } from './care-tasks.service';
import { CareTask } from './care-tasks.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-1';
const TASK_ID = 'ct000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockTask: CareTask = {
  id: TASK_ID,
  facilityId: FACILITY_ID,
  residentId: RESIDENT_ID,
  title: 'Morning hygiene routine',
  category: 'personal',
  scheduledTime: '2025-05-10T08:00:00.000Z',
  isCompleted: false,
  createdAt: '2025-05-10T07:00:00.000Z',
  updatedAt: '2025-05-10T07:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

describe('CareTasksController', () => {
  let controller: CareTasksController;
  let service: jest.Mocked<CareTasksService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CareTasksController],
      providers: [
        {
          provide: CareTasksService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockTask),
            findAll: jest.fn().mockResolvedValue([mockTask]),
            complete: jest.fn().mockResolvedValue({
              ...mockTask,
              isCompleted: true,
              completedBy: USER_ID,
              completedAt: '2025-05-10T09:00:00.000Z',
            }),
          },
        },
      ],
    }).compile();

    controller = module.get(CareTasksController);
    service = module.get(CareTasksService);
  });

  describe('create()', () => {
    it('creates a care task', async () => {
      const dto = { residentId: RESIDENT_ID, title: 'Morning hygiene routine' };
      const result = await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, dto);
      expect(result.id).toBe(TASK_ID);
    });
  });

  describe('findAll()', () => {
    it('returns tasks list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        date: undefined,
        category: undefined,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('complete()', () => {
    it('marks task complete with audit', async () => {
      const result = await controller.complete(mockRequest, TASK_ID);
      expect(service.complete).toHaveBeenCalledWith(
        FACILITY_ID,
        TASK_ID,
        USER_ID,
      );
      expect(result.isCompleted).toBe(true);
      expect(result.completedBy).toBe(USER_ID);
    });
  });
});
