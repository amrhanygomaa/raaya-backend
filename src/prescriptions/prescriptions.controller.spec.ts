/**
 * US-13-05 – PrescriptionsController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { Prescription } from './prescriptions.schema';

const FACILITY_ID = 'facility-test';
const RX_ID = 'rx000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockRx: Prescription = {
  id: RX_ID,
  facilityId: FACILITY_ID,
  residentId: RESIDENT_ID,
  title: 'Metformin 500mg - Daily',
  doctorName: 'Dr. Sami',
  prescriptionDate: '2025-05-10',
  createdAt: '2025-05-10T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: 'nurse-1',
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

describe('PrescriptionsController', () => {
  let controller: PrescriptionsController;
  let service: jest.Mocked<PrescriptionsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrescriptionsController],
      providers: [
        {
          provide: PrescriptionsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockRx),
            findAll: jest.fn().mockResolvedValue([mockRx]),
          },
        },
      ],
    }).compile();

    controller = module.get(PrescriptionsController);
    service = module.get(PrescriptionsService);
  });

  describe('create()', () => {
    it('creates a prescription', async () => {
      const dto = { residentId: RESIDENT_ID, title: 'Metformin 500mg - Daily' };
      const result = await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, dto);
      expect(result.id).toBe(RX_ID);
    });
  });

  describe('findAll()', () => {
    it('returns prescriptions list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
      });
      expect(result).toHaveLength(1);
    });
  });
});
