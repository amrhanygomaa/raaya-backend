import { Test, TestingModule } from '@nestjs/testing';
import { FamilyMembersController } from './family-members.controller';
import { FamilyMembersService, FamilyMember } from './family-members.service';

const FACILITY_ID = 'facility-test';
const RESIDENT_ID = 'a1b2c3d4-0000-0000-0000-000000000001';
const FAMILY_MEMBER_ID = 'fm000000-0000-0000-0000-000000000001';
const FAMILY_EMAIL = 'family@example.com';

const mockRequest = {
  user: {
    userId: 'family-user-1',
    email: FAMILY_EMAIL,
    roles: ['Family'],
    facilityId: FACILITY_ID,
  },
};

const mockMember: FamilyMember = {
  id: FAMILY_MEMBER_ID,
  residentId: RESIDENT_ID,
  fullName: 'Family Member',
  relationship: 'family',
  phone: '+201000000000',
  email: FAMILY_EMAIL,
  isPrimary: true,
  createdAt: '2026-05-25T00:00:00.000Z',
  updatedAt: '2026-05-25T00:00:00.000Z',
};

describe('FamilyMembersController', () => {
  let controller: FamilyMembersController;
  let service: jest.Mocked<FamilyMembersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyMembersController],
      providers: [
        {
          provide: FamilyMembersService,
          useValue: {
            findByEmail: jest.fn().mockResolvedValue([mockMember]),
            findByResident: jest.fn().mockResolvedValue([mockMember]),
            findOne: jest.fn().mockResolvedValue(mockMember),
            create: jest.fn().mockResolvedValue(mockMember),
            update: jest.fn().mockResolvedValue(mockMember),
            delete: jest.fn().mockResolvedValue({ deleted: true }),
          },
        },
      ],
    }).compile();

    controller = module.get(FamilyMembersController);
    service = module.get(FamilyMembersService);
  });

  it('returns family links for the current user email', async () => {
    const result = await controller.findMine(mockRequest);

    expect(service.findByEmail).toHaveBeenCalledWith(FACILITY_ID, FAMILY_EMAIL);
    expect(result).toEqual([mockMember]);
  });

  it('lists family members for a resident', async () => {
    const result = await controller.findAll(mockRequest, RESIDENT_ID);

    expect(service.findByResident).toHaveBeenCalledWith(
      FACILITY_ID,
      RESIDENT_ID,
    );
    expect(result).toEqual([mockMember]);
  });
});
