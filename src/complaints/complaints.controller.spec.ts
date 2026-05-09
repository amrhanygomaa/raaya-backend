/**
 * US-07-03 – ComplaintsController unit tests
 *
 * Validates:
 *  - POST /complaints – create complaint
 *  - GET /complaints – list with filters
 *  - GET /complaints/:id – get single complaint
 *  - PATCH /complaints/:id/status – valid + invalid transitions
 *  - Audit fields populated on resolution
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ComplaintsController } from './complaints.controller';
import { ComplaintsService } from './complaints.service';
import { Complaint } from './complaints.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'admin-1';
const COMPLAINT_ID = 'cp000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockComplaintOpen: Complaint = {
  id: COMPLAINT_ID,
  residentId: RESIDENT_ID,
  facilityId: FACILITY_ID,
  submittedBy: 'family-khalid',
  category: 'care_quality',
  subject: 'PT schedule concern',
  description: 'Missed two sessions',
  status: 'open',
  priority: 'high',
  createdAt: '2025-05-08T00:00:00.000Z',
  updatedAt: '2025-05-08T00:00:00.000Z',
};

const mockComplaintInProgress: Complaint = {
  ...mockComplaintOpen,
  status: 'in_progress',
};

const mockComplaintResolved: Complaint = {
  ...mockComplaintOpen,
  status: 'resolved',
  resolvedBy: USER_ID,
  resolvedAt: '2025-05-09T10:00:00.000Z',
  resolutionNotes: 'PT schedule corrected',
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'admin@test.sa',
    roles: ['Admin'],
    facilityId: FACILITY_ID,
  },
};

describe('ComplaintsController', () => {
  let controller: ComplaintsController;
  let service: jest.Mocked<ComplaintsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ComplaintsController],
      providers: [
        {
          provide: ComplaintsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockComplaintOpen),
            findAll: jest.fn().mockResolvedValue([mockComplaintOpen]),
            findOne: jest.fn().mockResolvedValue(mockComplaintOpen),
            updateStatus: jest.fn().mockResolvedValue(mockComplaintInProgress),
          },
        },
      ],
    }).compile();

    controller = module.get(ComplaintsController);
    service = module.get(ComplaintsService);
  });

  // ── CREATE ────────────────────────────────────────────────────────────

  describe('create()', () => {
    it('creates a complaint with facility and user context', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        category: 'care_quality',
        subject: 'PT schedule concern',
        description: 'Missed two sessions',
        priority: 'high',
      };

      const result = await controller.create(mockRequest, dto);

      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, USER_ID, dto);
      expect(result.status).toBe('open');
      expect(result.id).toBe(COMPLAINT_ID);
    });
  });

  // ── LIST ──────────────────────────────────────────────────────────────

  describe('findAll()', () => {
    it('returns complaints list for facility', async () => {
      const result = await controller.findAll(mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        status: undefined,
        priority: undefined,
        residentId: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes filters to service', async () => {
      await controller.findAll(mockRequest, 'open', 'high', RESIDENT_ID);

      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        status: 'open',
        priority: 'high',
        residentId: RESIDENT_ID,
      });
    });
  });

  // ── GET BY ID ─────────────────────────────────────────────────────────

  describe('findOne()', () => {
    it('returns single complaint', async () => {
      const result = await controller.findOne(mockRequest, COMPLAINT_ID);

      expect(service.findOne).toHaveBeenCalledWith(FACILITY_ID, COMPLAINT_ID);
      expect(result.id).toBe(COMPLAINT_ID);
    });
  });

  // ── STATUS UPDATE ─────────────────────────────────────────────────────

  describe('updateStatus()', () => {
    it('transitions open → in_progress', async () => {
      const dto = { status: 'in_progress' };

      const result = await controller.updateStatus(
        mockRequest,
        COMPLAINT_ID,
        dto,
      );

      expect(service.updateStatus).toHaveBeenCalledWith(
        FACILITY_ID,
        COMPLAINT_ID,
        USER_ID,
        dto,
      );
      expect(result.status).toBe('in_progress');
    });

    it('transitions to resolved with audit fields', async () => {
      service.updateStatus.mockResolvedValueOnce(mockComplaintResolved);
      const dto = {
        status: 'resolved',
        resolutionNotes: 'PT schedule corrected',
      };

      const result = await controller.updateStatus(
        mockRequest,
        COMPLAINT_ID,
        dto,
      );

      expect(result.resolvedBy).toBe(USER_ID);
      expect(result.resolvedAt).toBeDefined();
      expect(result.resolutionNotes).toBe('PT schedule corrected');
    });

    it('rejects invalid transition via service', async () => {
      service.updateStatus.mockRejectedValueOnce(
        new BadRequestException(
          "Invalid transition: open → resolved. Allowed transitions from 'open': in_progress, closed",
        ),
      );

      const dto = { status: 'resolved' };

      await expect(
        controller.updateStatus(mockRequest, COMPLAINT_ID, dto),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
