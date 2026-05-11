/**
 * US-14-03 – VolunteersController unit tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import { VolunteersController } from './volunteers.controller';
import { VolunteersService } from './volunteers.service';
import {
  VolunteerProfile,
  VolunteerOpportunity,
  VolunteerBooking,
} from './volunteers.schema';

const FACILITY_ID = 'facility-test';
const USER_ID = 'vol-1';
const PROFILE_ID = 'vp000000-0000-0000-0000-000000000001';
const OPP_ID = 'vo000000-0000-0000-0000-000000000001';
const BOOKING_ID = 'vb000000-0000-0000-0000-000000000001';

const mockProfile: VolunteerProfile = {
  id: PROFILE_ID,
  userId: USER_ID,
  facilityId: FACILITY_ID,
  name: 'Ahmad Volunteer',
  skills: ['First Aid'],
  hoursLogged: 10,
  socialLinks: {},
  createdAt: '2025-05-10T00:00:00.000Z',
  updatedAt: '2025-05-10T00:00:00.000Z',
};

const mockOpportunity: VolunteerOpportunity = {
  id: OPP_ID,
  facilityId: FACILITY_ID,
  title: 'Garden Cleanup',
  hours: 3,
  points: 30,
  tags: ['outdoor'],
  totalSlots: 5,
  filledSlots: 1,
  createdAt: '2025-05-10T00:00:00.000Z',
};

const mockBooking: VolunteerBooking = {
  id: BOOKING_ID,
  facilityId: FACILITY_ID,
  volunteerId: PROFILE_ID,
  opportunityId: OPP_ID,
  status: 'pending',
  createdAt: '2025-05-10T00:00:00.000Z',
};

const mockRequest = {
  user: {
    userId: USER_ID,
    email: 'vol@test.sa',
    roles: ['Volunteer'],
    facilityId: FACILITY_ID,
  },
};

describe('VolunteersController', () => {
  let controller: VolunteersController;
  let service: jest.Mocked<VolunteersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VolunteersController],
      providers: [
        {
          provide: VolunteersService,
          useValue: {
            getProfile: jest.fn().mockResolvedValue(mockProfile),
            upsertProfile: jest.fn().mockResolvedValue(mockProfile),
            getOpportunities: jest.fn().mockResolvedValue([mockOpportunity]),
            createBooking: jest.fn().mockResolvedValue(mockBooking),
            getBookings: jest.fn().mockResolvedValue([mockBooking]),
          },
        },
      ],
    }).compile();

    controller = module.get(VolunteersController);
    service = module.get(VolunteersService);
  });

  describe('getProfile()', () => {
    it('returns volunteer profile', async () => {
      const result = await controller.getProfile(mockRequest);
      expect(service.getProfile).toHaveBeenCalledWith(FACILITY_ID, USER_ID);
      expect(result.id).toBe(PROFILE_ID);
    });
  });

  describe('upsertProfile()', () => {
    it('upserts profile', async () => {
      const dto = { name: 'Ahmad Volunteer' };
      const result = await controller.upsertProfile(mockRequest, dto);
      expect(service.upsertProfile).toHaveBeenCalledWith(
        FACILITY_ID,
        USER_ID,
        dto,
      );
      expect(result.name).toBe('Ahmad Volunteer');
    });
  });

  describe('getOpportunities()', () => {
    it('returns opportunities list', async () => {
      const result = await controller.getOpportunities(mockRequest);
      expect(service.getOpportunities).toHaveBeenCalledWith(FACILITY_ID);
      expect(result).toHaveLength(1);
    });
  });

  describe('createBooking()', () => {
    it('creates a booking', async () => {
      const dto = { opportunityId: OPP_ID };
      const result = await controller.createBooking(mockRequest, dto);
      expect(service.createBooking).toHaveBeenCalledWith(
        FACILITY_ID,
        USER_ID,
        dto,
      );
      expect(result.status).toBe('pending');
    });
  });

  describe('getBookings()', () => {
    it('returns bookings list', async () => {
      const result = await controller.getBookings(mockRequest);
      expect(service.getBookings).toHaveBeenCalledWith(FACILITY_ID, USER_ID);
      expect(result).toHaveLength(1);
    });
  });
});
