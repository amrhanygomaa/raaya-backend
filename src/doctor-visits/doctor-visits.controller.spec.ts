/**
 * US-13-01 – DoctorVisitsController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { DoctorVisitsController } from './doctor-visits.controller';
import { DoctorVisitsService } from './doctor-visits.service';
import { DoctorVisit } from './doctor-visits.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-1';
const VISIT_ID = 'dv000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockVisit: DoctorVisit = {
  id: VISIT_ID,
  facilityId: FACILITY_ID,
  residentId: RESIDENT_ID,
  doctorName: 'Dr. Sami',
  specialty: 'Cardiology',
  visitDate: '2025-05-15',
  purpose: 'Routine cardiac checkup',
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

describe('DoctorVisitsController', () => {
  let controller: DoctorVisitsController;
  let service: jest.Mocked<DoctorVisitsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctorVisitsController],
      providers: [
        {
          provide: DoctorVisitsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockVisit),
            findAll: jest.fn().mockResolvedValue([mockVisit]),
            update: jest
              .fn()
              .mockResolvedValue({ ...mockVisit, results: 'Normal' }),
          },
        },
      ],
    }).compile();

    controller = module.get(DoctorVisitsController);
    service = module.get(DoctorVisitsService);
  });

  describe('create()', () => {
    it('schedules a doctor visit', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        doctorName: 'Dr. Sami',
        visitDate: '2025-05-15',
      };
      const result = await controller.create(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, USER_ID, dto);
      expect(result.id).toBe(VISIT_ID);
    });
  });

  describe('findAll()', () => {
    it('returns visits list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        upcoming: false,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('update()', () => {
    it('updates visit results', async () => {
      const dto = { results: 'Normal' };
      const result = await controller.update(mockRequest, VISIT_ID, dto);
      expect(service.update).toHaveBeenCalledWith(FACILITY_ID, VISIT_ID, dto);
      expect(result.results).toBe('Normal');
    });
  });
});
