/**
 * US-15-03 – BillingController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { FamilyBill } from './billing.schema';

const FACILITY_ID = 'facility-test';
const BILL_ID = 'bl000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockBill: FamilyBill = {
  id: BILL_ID,
  facilityId: FACILITY_ID,
  residentId: RESIDENT_ID,
  title: 'Monthly Care Fee',
  month: '2025-05',
  amount: 5000,
  isPaid: false,
  dueDate: '2025-06-01',
  createdAt: '2025-05-01T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: 'admin-1',
    email: 'admin@test.sa',
    roles: ['Admin'],
    facilityId: FACILITY_ID,
  },
};

describe('BillingController', () => {
  let controller: BillingController;
  let service: jest.Mocked<BillingService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [
        {
          provide: BillingService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockBill),
            findAll: jest.fn().mockResolvedValue([mockBill]),
            markPaid: jest
              .fn()
              .mockResolvedValue({ ...mockBill, isPaid: true }),
          },
        },
      ],
    }).compile();

    controller = module.get(BillingController);
    service = module.get(BillingService);
  });

  describe('create()', () => {
    it('creates a bill', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        title: 'Monthly Care Fee',
        month: '2025-05',
        amount: 5000,
      };
      const result = await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, dto);
      expect(result.id).toBe(BILL_ID);
    });
  });

  describe('findAll()', () => {
    it('returns bills list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        isPaid: undefined,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('markPaid()', () => {
    it('marks bill as paid', async () => {
      const result = await controller.markPaid(mockRequest, BILL_ID);
      expect(service.markPaid).toHaveBeenCalledWith(FACILITY_ID, BILL_ID);
      expect(result.isPaid).toBe(true);
    });
  });
});
