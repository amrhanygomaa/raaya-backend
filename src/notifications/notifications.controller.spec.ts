/**
 * US-15-07 – NotificationsController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './notifications.schema';
import { PG_POOL } from '../database/database.module';
import { RealtimeGateway } from '../gateway/realtime.gateway';

const FACILITY_ID = 'facility-test';
const USER_ID = 'nurse-seed';
const NOTIF_ID = 'nt000000-0000-0000-0000-000000000001';

const mockNotification: Notification = {
  id: NOTIF_ID,
  facilityId: FACILITY_ID,
  userId: USER_ID,
  message: 'Medication reminder: Aspirin 100mg for Ahmad at 08:00',
  type: 'medication_reminder',
  read: false,
  createdAt: '2025-05-08T05:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: 'admin-1',
    email: 'admin@test.sa',
    roles: ['Admin'],
    facilityId: FACILITY_ID,
  },
};

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockNotification),
            findByUser: jest.fn().mockResolvedValue([mockNotification]),
            markAsRead: jest.fn().mockResolvedValue({ status: 'ok' }),
          },
        },
        { provide: PG_POOL, useValue: { query: jest.fn() } },
        {
          provide: RealtimeGateway,
          useValue: {
            broadcastNotification: jest.fn(),
            broadcastLiveEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(NotificationsController);
    service = module.get(NotificationsService);
  });

  describe('create()', () => {
    it('creates a notification', async () => {
      const dto = {
        userId: USER_ID,
        message: 'Medication reminder: Aspirin 100mg for Ahmad at 08:00',
        type: 'medication_reminder',
      };

      const result = await controller.create(mockRequest, dto);

      expect(service.create).toHaveBeenCalledWith(FACILITY_ID, dto);
      expect(result.id).toBe(NOTIF_ID);
    });
  });

  describe('findByUser()', () => {
    it('returns notifications for a user', async () => {
      const result = await controller.findByUser(mockRequest, USER_ID);

      expect(service.findByUser).toHaveBeenCalledWith(FACILITY_ID, USER_ID);
      expect(result).toHaveLength(1);
    });
  });

  describe('markAsRead()', () => {
    it('marks a notification as read', async () => {
      const result = await controller.markAsRead(mockRequest, NOTIF_ID);

      expect(service.markAsRead).toHaveBeenCalledWith(FACILITY_ID, NOTIF_ID);
      expect(result.status).toBe('ok');
    });
  });
});
