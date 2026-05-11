/**
 * US-12-07 – InventoryController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryItem } from './inventory.schema';

const FACILITY_ID = 'facility-test';
const ITEM_ID = 'inv00000-0000-0000-0000-000000000001';

const mockItem: InventoryItem = {
  id: ITEM_ID,
  facilityId: FACILITY_ID,
  name: 'Disposable Gloves',
  category: 'supplies',
  currentStock: 100,
  minRequired: 20,
  unit: 'box',
  createdAt: '2025-05-10T00:00:00.000Z',
  updatedAt: '2025-05-10T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: 'nurse-1',
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

describe('InventoryController', () => {
  let controller: InventoryController;
  let service: jest.Mocked<InventoryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InventoryController],
      providers: [
        {
          provide: InventoryService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockItem),
            findAll: jest.fn().mockResolvedValue([mockItem]),
            updateStock: jest
              .fn()
              .mockResolvedValue({ ...mockItem, currentStock: 150 }),
            getLowStock: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get(InventoryController);
    service = module.get(InventoryService);
  });

  describe('create()', () => {
    it('creates an inventory item', async () => {
      const dto = { name: 'Disposable Gloves' };
      const result = await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, dto);
      expect(result.id).toBe(ITEM_ID);
    });
  });

  describe('findAll()', () => {
    it('returns items list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        category: undefined,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateStock()', () => {
    it('updates stock level', async () => {
      const dto = { currentStock: 150 };
      const result = await controller.updateStock(mockRequest, ITEM_ID, dto);
      expect(service.updateStock).toHaveBeenCalledWith(
        FACILITY_ID,
        ITEM_ID,
        dto,
      );
      expect(result.currentStock).toBe(150);
    });
  });

  describe('getLowStock()', () => {
    it('returns low-stock items', async () => {
      const result = await controller.getLowStock(mockRequest);
      expect(service.getLowStock).toHaveBeenCalledWith(FACILITY_ID);
      expect(result).toHaveLength(0);
    });
  });
});
