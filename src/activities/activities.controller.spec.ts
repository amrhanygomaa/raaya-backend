/**
 * US-14-01 – ActivitiesController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivitySession } from './activities.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-1';
const ACTIVITY_ID = 'ac000000-0000-0000-0000-000000000001';

const mockActivity: ActivitySession = {
  id: ACTIVITY_ID,
  facilityId: FACILITY_ID,
  title: 'Morning Yoga',
  startTime: '2025-05-12T09:00:00.000Z',
  location: 'Garden',
  participants: [],
  createdBy: USER_ID,
  createdAt: '2025-05-10T00:00:00.000Z',
  updatedAt: '2025-05-10T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let service: jest.Mocked<ActivitiesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockActivity),
            findAll: jest.fn().mockResolvedValue([mockActivity]),
            update: jest
              .fn()
              .mockResolvedValue({ ...mockActivity, title: 'Updated' }),
          },
        },
      ],
    }).compile();

    controller = module.get(ActivitiesController);
    service = module.get(ActivitiesService);
  });

  describe('create()', () => {
    it('creates an activity', async () => {
      const dto = {
        title: 'Morning Yoga',
        startTime: '2025-05-12T09:00:00.000Z',
      };
      const result = await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, USER_ID, dto);
      expect(result.id).toBe(ACTIVITY_ID);
    });
  });

  describe('findAll()', () => {
    it('returns activities list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        date: undefined,
        upcoming: false,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('update()', () => {
    it('updates an activity', async () => {
      const dto = { title: 'Updated' };
      const result = await controller.update(mockRequest, ACTIVITY_ID, dto);
      expect(service.update).toHaveBeenCalledWith(
        FACILITY_ID,
        ACTIVITY_ID,
        dto,
      );
      expect(result.title).toBe('Updated');
    });
  });
});
