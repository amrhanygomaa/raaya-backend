/**
 * US-10-01 – AuthController unit tests
 *
 * Validates:
 *  - GET /auth/me returns the authenticated user's profile from the JWT
 */

import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(() => {
    controller = new AuthController();
  });

  describe('getMe()', () => {
    it('returns the user profile from the JWT-enriched request', () => {
      const req = {
        user: {
          userId: 'user-1',
          email: 'nurse@raaya.sa',
          roles: ['Nurse'],
          facilityId: 'facility-abc',
        },
      };

      const result = controller.getMe(req);

      expect(result).toEqual({
        userId: 'user-1',
        email: 'nurse@raaya.sa',
        roles: ['Nurse'],
        facilityId: 'facility-abc',
      });
    });

    it('returns all roles when user has multiple groups', () => {
      const req = {
        user: {
          userId: 'user-2',
          email: 'admin@raaya.sa',
          roles: ['Admin', 'FacilityManager'],
          facilityId: 'facility-xyz',
        },
      };

      const result = controller.getMe(req);

      expect(result.roles).toEqual(['Admin', 'FacilityManager']);
    });

    it('returns empty roles array when user has no roles', () => {
      const req = {
        user: {
          userId: 'user-3',
          email: 'guest@raaya.sa',
          roles: [],
          facilityId: 'facility-abc',
        },
      };

      const result = controller.getMe(req);

      expect(result.roles).toEqual([]);
    });
  });
});
