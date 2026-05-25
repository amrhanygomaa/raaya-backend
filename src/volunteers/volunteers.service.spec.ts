import { NotFoundException } from '@nestjs/common';
import { VolunteersService } from './volunteers.service';

describe('VolunteersService public profile links', () => {
  const pool = {
    query: jest.fn(),
  };

  let service: VolunteersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VolunteersService(pool as any);
  });

  it('returns a sanitized profile for a valid public token', async () => {
    const expiresAt = new Date('2026-06-01T00:00:00.000Z');
    pool.query.mockResolvedValue({
      rowCount: 1,
      rows: [
        {
          name: 'Ahmad Volunteer',
          bio: 'First aid volunteer',
          location: 'Cairo',
          skills: ['First Aid'],
          hours_logged: 10,
          social_links: { linkedin: 'https://example.com/ahmad' },
          cv_file_url: 'https://example.com/cv.pdf',
          expires_at: expiresAt,
          user_id: 'hidden-user',
          facility_id: 'hidden-facility',
        },
      ],
    });

    const result = await service.getPublicProfileByToken(' share-token ');

    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining('volunteer_public_links'),
      ['share-token'],
    );
    expect(result).toEqual({
      name: 'Ahmad Volunteer',
      bio: 'First aid volunteer',
      location: 'Cairo',
      skills: ['First Aid'],
      hoursLogged: 10,
      socialLinks: { linkedin: 'https://example.com/ahmad' },
      cvFileUrl: 'https://example.com/cv.pdf',
      expiresAt: '2026-06-01T00:00:00.000Z',
    });
    expect(result).not.toHaveProperty('userId');
    expect(result).not.toHaveProperty('facilityId');
  });

  it('rejects missing, expired, or revoked public tokens as not found', async () => {
    pool.query.mockResolvedValue({ rowCount: 0, rows: [] });

    await expect(
      service.getPublicProfileByToken('missing-token'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects blank public tokens without querying the database', async () => {
    await expect(service.getPublicProfileByToken('   ')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(pool.query).not.toHaveBeenCalled();
  });
});
