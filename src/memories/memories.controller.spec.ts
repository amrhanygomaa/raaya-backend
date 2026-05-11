/**
 * US-14-06 – MemoriesController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MemoriesController } from './memories.controller';
import { MemoriesService } from './memories.service';
import { MemoryMoment } from './memories.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-1';
const MOMENT_ID = 'mm000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockMoment: MemoryMoment = {
  id: MOMENT_ID,
  facilityId: FACILITY_ID,
  residentId: RESIDENT_ID,
  imageUrl: 'https://example.com/img.jpg',
  activityTitle: 'Garden Walk',
  appreciations: 3,
  uploadedBy: USER_ID,
  createdAt: '2025-05-10T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

describe('MemoriesController', () => {
  let controller: MemoriesController;
  let service: jest.Mocked<MemoriesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoriesController],
      providers: [
        {
          provide: MemoriesService,
          useValue: {
            create: jest.fn().mockResolvedValue({ moment: mockMoment }),
            findAll: jest.fn().mockResolvedValue([mockMoment]),
            appreciate: jest
              .fn()
              .mockResolvedValue({ ...mockMoment, appreciations: 4 }),
          },
        },
      ],
    }).compile();

    controller = module.get(MemoriesController);
    service = module.get(MemoriesService);
  });

  describe('create()', () => {
    it('creates a memory moment', async () => {
      const dto = { residentId: RESIDENT_ID, activityTitle: 'Garden Walk' };
      const result = await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, USER_ID, dto);
      expect(result.moment.id).toBe(MOMENT_ID);
    });
  });

  describe('findAll()', () => {
    it('returns moments list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('appreciate()', () => {
    it('increments appreciation count', async () => {
      const result = await controller.appreciate(mockRequest, MOMENT_ID);
      expect(service.appreciate).toHaveBeenCalledWith(FACILITY_ID, MOMENT_ID);
      expect(result.appreciations).toBe(4);
    });
  });
});
