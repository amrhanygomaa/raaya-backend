/**
 * US-05-01 – FamilyBridgeController unit tests
 *
 * Validates:
 *  - POST /family-bridge/media/upload – presigned upload
 *  - PATCH /family-bridge/media/:id/confirm – confirm upload
 *  - GET /family-bridge/media – list media
 *  - POST /family-bridge/visits – book visit
 *  - GET /family-bridge/visits – list visits
 *  - PATCH /family-bridge/visits/:id/status – update visit status
 *  - Family access check is invoked for family-scoped endpoints
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FamilyBridgeController } from './family-bridge.controller';
import { FamilyBridgeService } from './family-bridge.service';
import { MediaItem, MediaUploadResult, Visit } from './family-bridge.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'family-user-1';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const MEDIA_ID = 'f1000000-0000-0000-0000-000000000001';
const VISIT_ID = 'f3000000-0000-0000-0000-000000000001';

const mockMedia: MediaItem = {
  id: MEDIA_ID,
  residentId: RESIDENT_ID,
  facilityId: FACILITY_ID,
  uploadedBy: USER_ID,
  s3Key: 'facility-test/res1/photo.jpg',
  fileName: 'photo.jpg',
  contentType: 'image/jpeg',
  fileSizeBytes: 245000,
  status: 'confirmed',
  caption: 'Family photo',
  createdAt: '2025-05-08T00:00:00.000Z',
  updatedAt: '2025-05-08T00:00:00.000Z',
};

const mockUploadResult: MediaUploadResult = {
  media: { ...mockMedia, status: 'pending_upload' },
  presignedUrl: 'https://s3.amazonaws.com/bucket/key?signed',
};

const mockVisit: Visit = {
  id: VISIT_ID,
  residentId: RESIDENT_ID,
  facilityId: FACILITY_ID,
  visitorName: 'Khalid Al-Rashid',
  visitorRelationship: 'son',
  bookedBy: USER_ID,
  visitDate: '2025-05-12',
  visitTimeStart: '10:00',
  visitTimeEnd: '11:30',
  status: 'pending',
  notes: 'Weekly visit',
  createdAt: '2025-05-08T00:00:00.000Z',
  updatedAt: '2025-05-08T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'khalid@example.sa',
    roles: ['Family'],
    facilityId: FACILITY_ID,
  },
};

const mockStaffRequest = {
  user: {
    userId: 'admin-1',
    email: 'admin@test.sa',
    roles: ['Admin'],
    facilityId: FACILITY_ID,
  },
};

describe('FamilyBridgeController', () => {
  let controller: FamilyBridgeController;
  let service: jest.Mocked<FamilyBridgeService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyBridgeController],
      providers: [
        {
          provide: FamilyBridgeService,
          useValue: {
            assertFamilyAccess: jest.fn().mockResolvedValue(undefined),
            requestUpload: jest.fn().mockResolvedValue(mockUploadResult),
            confirmUpload: jest.fn().mockResolvedValue(mockMedia),
            findMedia: jest.fn().mockResolvedValue([mockMedia]),
            bookVisit: jest.fn().mockResolvedValue(mockVisit),
            findVisits: jest.fn().mockResolvedValue([mockVisit]),
            updateVisitStatus: jest
              .fn()
              .mockResolvedValue({ ...mockVisit, status: 'approved' }),
          },
        },
      ],
    }).compile();

    controller = module.get(FamilyBridgeController);
    service = module.get(FamilyBridgeService);
  });

  // ── MEDIA ─────────────────────────────────────────────────────────────

  describe('requestUpload()', () => {
    it('checks family access and returns presigned URL', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
        caption: 'Family photo',
      };

      const result = await controller.requestUpload(mockRequest, dto);

      expect(service.assertFamilyAccess).toHaveBeenCalledWith(
        ['Family'],
        'khalid@example.sa',
        RESIDENT_ID,
      );
      expect(service.requestUpload).toHaveBeenCalledWith(
        FACILITY_ID,
        USER_ID,
        dto,
      );
      expect(result.presignedUrl).toBeDefined();
      expect(result.media.status).toBe('pending_upload');
    });
  });

  describe('confirmUpload()', () => {
    it('confirms a pending media upload', async () => {
      const dto = { fileSizeBytes: 245000 };

      const result = await controller.confirmUpload(mockRequest, MEDIA_ID, dto);

      expect(service.confirmUpload).toHaveBeenCalledWith(
        FACILITY_ID,
        MEDIA_ID,
        dto,
      );
      expect(result.status).toBe('confirmed');
    });
  });

  describe('findMedia()', () => {
    it('returns media list for facility', async () => {
      const result = await controller.findMedia(mockStaffRequest);

      expect(service.findMedia).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        status: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('checks family access when residentId is provided', async () => {
      await controller.findMedia(mockRequest, RESIDENT_ID);

      expect(service.assertFamilyAccess).toHaveBeenCalledWith(
        ['Family'],
        'khalid@example.sa',
        RESIDENT_ID,
      );
    });
  });

  // ── VISITS ────────────────────────────────────────────────────────────

  describe('bookVisit()', () => {
    it('checks family access and books a visit', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        visitorName: 'Khalid Al-Rashid',
        visitorRelationship: 'son',
        visitDate: '2025-05-12',
        visitTimeStart: '10:00',
        visitTimeEnd: '11:30',
        notes: 'Weekly visit',
      };

      const result = await controller.bookVisit(mockRequest, dto);

      expect(service.assertFamilyAccess).toHaveBeenCalledWith(
        ['Family'],
        'khalid@example.sa',
        RESIDENT_ID,
      );
      expect(service.bookVisit).toHaveBeenCalledWith(FACILITY_ID, USER_ID, dto);
      expect(result.id).toBe(VISIT_ID);
    });
  });

  describe('findVisits()', () => {
    it('returns visits list for facility', async () => {
      const result = await controller.findVisits(mockStaffRequest);

      expect(service.findVisits).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        status: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes filters to service', async () => {
      await controller.findVisits(mockStaffRequest, RESIDENT_ID, 'pending');

      expect(service.findVisits).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: RESIDENT_ID,
        status: 'pending',
      });
    });
  });

  describe('updateVisitStatus()', () => {
    it('updates visit status and passes userId', async () => {
      const dto = { status: 'approved' };

      const result = await controller.updateVisitStatus(
        mockStaffRequest,
        VISIT_ID,
        dto,
      );

      expect(service.updateVisitStatus).toHaveBeenCalledWith(
        FACILITY_ID,
        VISIT_ID,
        'admin-1',
        dto,
      );
      expect(result.status).toBe('approved');
    });
  });
});
