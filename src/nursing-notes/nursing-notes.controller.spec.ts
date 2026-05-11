/**
 * US-12-01 – NursingNotesController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NursingNotesController } from './nursing-notes.controller';
import { NursingNotesService } from './nursing-notes.service';
import { NursingNote } from './nursing-notes.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-1';
const NOTE_ID = 'nn000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockNote: NursingNote = {
  id: NOTE_ID,
  facilityId: FACILITY_ID,
  residentId: RESIDENT_ID,
  authorId: USER_ID,
  content: 'Routine morning check completed.',
  category: 'routine',
  createdAt: '2025-05-08T08:00:00.000Z',
  updatedAt: '2025-05-08T08:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'nurse@test.sa',
    roles: ['Nurse'],
    facilityId: FACILITY_ID,
  },
};

describe('NursingNotesController', () => {
  let controller: NursingNotesController;
  let service: jest.Mocked<NursingNotesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NursingNotesController],
      providers: [
        {
          provide: NursingNotesService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockNote),
            findAll: jest.fn().mockResolvedValue([mockNote]),
            findOne: jest.fn().mockResolvedValue(mockNote),
            update: jest
              .fn()
              .mockResolvedValue({ ...mockNote, content: 'Updated content' }),
          },
        },
      ],
    }).compile();

    controller = module.get(NursingNotesController);
    service = module.get(NursingNotesService);
  });

  describe('create()', () => {
    it('creates a nursing note with facility and user context', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        content: 'Routine morning check completed.',
        category: 'routine',
      };

      const result = await controller.create(mockRequest, dto);

      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, USER_ID, dto);
      expect(result.id).toBe(NOTE_ID);
      expect(result.category).toBe('routine');
    });
  });

  describe('findAll()', () => {
    it('returns notes list for facility', async () => {
      const result = await controller.findAll(mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
        authorId: undefined,
      });
      expect(result).toHaveLength(1);
    });

    it('passes filters to service', async () => {
      await controller.findAll(mockRequest, RESIDENT_ID, USER_ID);

      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: RESIDENT_ID,
        authorId: USER_ID,
      });
    });
  });

  describe('findOne()', () => {
    it('returns single nursing note', async () => {
      const result = await controller.findOne(mockRequest, NOTE_ID);

      expect(service.findOne).toHaveBeenCalledWith(FACILITY_ID, NOTE_ID);
      expect(result.id).toBe(NOTE_ID);
    });
  });

  describe('update()', () => {
    it('updates nursing note content', async () => {
      const dto = { content: 'Updated content' };

      const result = await controller.update(mockRequest, NOTE_ID, dto);

      expect(service.update).toHaveBeenCalledWith(FACILITY_ID, NOTE_ID, dto);
      expect(result.content).toBe('Updated content');
    });
  });
});
