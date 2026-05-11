/**
 * US-13-07 – MealPlansController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MealPlansController } from './meal-plans.controller';
import { MealPlansService } from './meal-plans.service';
import { MealPlan } from './meal-plans.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-1';
const PLAN_ID = 'mp000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockPlan: MealPlan = {
  id: PLAN_ID,
  facilityId: FACILITY_ID,
  residentId: RESIDENT_ID,
  planDate: '2025-05-12',
  breakfast: 'Oatmeal',
  lunch: 'Grilled chicken',
  dinner: 'Salad',
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

describe('MealPlansController', () => {
  let controller: MealPlansController;
  let service: jest.Mocked<MealPlansService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MealPlansController],
      providers: [
        {
          provide: MealPlansService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockPlan),
            findAll: jest.fn().mockResolvedValue([mockPlan]),
            update: jest
              .fn()
              .mockResolvedValue({ ...mockPlan, breakfast: 'Eggs' }),
          },
        },
      ],
    }).compile();

    controller = module.get(MealPlansController);
    service = module.get(MealPlansService);
  });

  describe('create()', () => {
    it('creates a meal plan', async () => {
      const dto = { residentId: RESIDENT_ID, planDate: '2025-05-12' };
      const result = await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, USER_ID, dto);
      expect(result.id).toBe(PLAN_ID);
    });
  });

  describe('findAll()', () => {
    it('returns plans list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        date: undefined,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('update()', () => {
    it('updates a meal plan', async () => {
      const dto = { breakfast: 'Eggs' };
      const result = await controller.update(mockRequest, PLAN_ID, dto);
      expect(service.update).toHaveBeenCalledWith(FACILITY_ID, PLAN_ID, dto);
      expect(result.breakfast).toBe('Eggs');
    });
  });
});
