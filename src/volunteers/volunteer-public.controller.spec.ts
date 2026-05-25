import { Test, TestingModule } from '@nestjs/testing';
import { VolunteerPublicController } from './volunteer-public.controller';
import { VolunteersService } from './volunteers.service';
import { PublicVolunteerProfile } from './volunteers.schema';

const TOKEN = 'share-token';

const mockPublicProfile: PublicVolunteerProfile = {
  name: 'Ahmad Volunteer',
  bio: 'First aid volunteer',
  location: 'Cairo',
  skills: ['First Aid'],
  hoursLogged: 10,
  socialLinks: {},
  expiresAt: '2026-06-01T00:00:00.000Z',
};

describe('VolunteerPublicController', () => {
  let controller: VolunteerPublicController;
  let service: jest.Mocked<VolunteersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VolunteerPublicController],
      providers: [
        {
          provide: VolunteersService,
          useValue: {
            getPublicProfileByToken: jest
              .fn()
              .mockResolvedValue(mockPublicProfile),
          },
        },
      ],
    }).compile();

    controller = module.get(VolunteerPublicController);
    service = module.get(VolunteersService);
  });

  it('returns a public volunteer profile by token', async () => {
    const result = await controller.getPublicProfile(TOKEN);

    expect(service.getPublicProfileByToken).toHaveBeenCalledWith(TOKEN);
    expect(result).toEqual(mockPublicProfile);
  });
});
