/**
 * US-15-01 – VoiceMessagesController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VoiceMessagesController } from './voice-messages.controller';
import { VoiceMessagesService } from './voice-messages.service';
import { VoiceMessage } from './voice-messages.schema';

const FACILITY_ID = 'facility-test';
const MSG_ID = 'vm000000-0000-0000-0000-000000000001';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

const mockMessage: VoiceMessage = {
  id: MSG_ID,
  facilityId: FACILITY_ID,
  residentId: RESIDENT_ID,
  senderType: 'family',
  title: 'Good morning from Khalid',
  audioUrl: 'https://example.com/audio.mp3',
  durationSeconds: 45,
  createdAt: '2025-05-10T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: 'family-khalid',
    email: 'khalid@test.sa',
    roles: ['Family'],
    facilityId: FACILITY_ID,
  },
};

describe('VoiceMessagesController', () => {
  let controller: VoiceMessagesController;
  let service: jest.Mocked<VoiceMessagesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoiceMessagesController],
      providers: [
        {
          provide: VoiceMessagesService,
          useValue: {
            create: jest.fn().mockResolvedValue({ message: mockMessage }),
            findAll: jest.fn().mockResolvedValue([mockMessage]),
          },
        },
      ],
    }).compile();

    controller = module.get(VoiceMessagesController);
    service = module.get(VoiceMessagesService);
  });

  describe('upload()', () => {
    it('creates a voice message', async () => {
      const dto = {
        residentId: RESIDENT_ID,
        senderType: 'family',
        title: 'Good morning from Khalid',
      };
      const result = await controller.upload(mockRequest, dto);
      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, dto);
      expect(result.message.id).toBe(MSG_ID);
    });
  });

  describe('findAll()', () => {
    it('returns messages list', async () => {
      const result = await controller.findAll(mockRequest);
      expect(service.findAll).toHaveBeenCalledWith(FACILITY_ID, {
        residentId: undefined,
      });
      expect(result).toHaveLength(1);
    });
  });
});
