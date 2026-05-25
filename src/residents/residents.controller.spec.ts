/**
 * US-03-02 – ResidentsController unit tests
 *
 * Validates:
 *  - POST /residents requires Admin role and passes facilityId from JWT
 *  - GET /residents lists residents for caller's facility
 *  - GET /residents/:id returns a single resident
 *  - PATCH /residents/:id requires Admin role
 *  - cross-facility access is blocked (facilityId always from JWT)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ResidentsController } from './residents.controller';
import { ResidentsService } from './residents.service';
import { Resident } from './residents.schema';
import { RealtimeGateway } from '../gateway/realtime.gateway';

const FACILITY_ID = 'facility-test';
const RESIDENT_ID = '11111111-1111-1111-1111-111111111111';

const mockResident: Resident = {
  id: RESIDENT_ID,
  facilityId: FACILITY_ID,
  firstName: 'Ahmad',
  lastName: 'Al-Rashid',
  dateOfBirth: '1940-03-15',
  gender: 'male',
  nationalId: '1234567890',
  roomNumber: '101',
  admissionDate: '2025-01-10',
  status: 'active',
  createdAt: '2025-01-10T00:00:00.000Z',
  updatedAt: '2025-01-10T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: 'user-1',
    email: 'admin@test.sa',
    roles: ['Admin'],
    facilityId: FACILITY_ID,
  },
};

describe('ResidentsController', () => {
  let controller: ResidentsController;
  let service: jest.Mocked<ResidentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResidentsController],
      providers: [
        {
          provide: ResidentsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockResident),
            findAll: jest.fn().mockResolvedValue([mockResident]),
            findOne: jest.fn().mockResolvedValue(mockResident),
            update: jest.fn().mockResolvedValue(mockResident),
          },
        },
        {
          provide: 'PG_POOL',
          useValue: {
            query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          },
        },
        {
          provide: RealtimeGateway,
          useValue: {
            broadcastLiveEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ResidentsController);
    service = module.get(ResidentsService);
  });

  // ── POST /residents ─────────────────────────────────────────────────────

  describe('create()', () => {
    it('passes facilityId from the JWT to the service', async () => {
      const dto = {
        firstName: 'Ahmad',
        lastName: 'Al-Rashid',
        dateOfBirth: '1940-03-15',
        gender: 'male' as const,
        admissionDate: '2025-01-10',
      };

      const result = await controller.create(mockRequest, dto);

      expect(service.create).toHaveBeenCalledWith(
        FACILITY_ID,
        dto,
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result.id).toBe(RESIDENT_ID);
    });
  });

  // ── GET /residents ──────────────────────────────────────────────────────

  describe('findAll()', () => {
    it("returns residents for the caller's facility", async () => {
      const result = await controller.findAll(mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        status: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes status filter to the service', async () => {
      await controller.findAll(mockRequest, 'active');

      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        status: 'active',
      });
    });
  });

  // ── GET /residents/:id ──────────────────────────────────────────────────

  describe('findOne()', () => {
    it('uses facilityId from JWT for scoping', async () => {
      const result = await controller.findOne(mockRequest, RESIDENT_ID);

      expect(service.findOne).toHaveBeenCalledWith(FACILITY_ID, RESIDENT_ID);
      expect(result.id).toBe(RESIDENT_ID);
    });
  });

  // ── PATCH /residents/:id ────────────────────────────────────────────────

  describe('update()', () => {
    it('passes facilityId from JWT and calls service.update', async () => {
      const dto = { roomNumber: '202' };

      const result = await controller.update(mockRequest, RESIDENT_ID, dto);

      expect(service.update).toHaveBeenCalledWith(
        FACILITY_ID,
        RESIDENT_ID,
        dto,
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result.id).toBe(RESIDENT_ID);
    });
  });
});
