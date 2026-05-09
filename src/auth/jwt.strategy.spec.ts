/**
 * US-10-01 – JwtStrategy unit tests
 *
 * Validates:
 *  - validate() extracts userId, email, roles, facilityId from a Cognito JWT
 *  - cognito:groups takes precedence over custom:role
 *  - custom:role is used as fallback when cognito:groups is absent
 *  - roles is empty when neither source is present
 *  - throws UnauthorizedException for null/undefined payloads
 *  - REGRESSION: throws UnauthorizedException when custom:facilityId is missing
 */

import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

// We only test the synchronous validate() method – the constructor
// wiring (JWKS, Passport plumbing) is covered by e2e / integration tests.
// To avoid the constructor calling out to JWKS we set the required env vars.
beforeAll(() => {
  process.env.COGNITO_USER_POOL_ID = 'us-east-1_TestPool';
  process.env.COGNITO_CLIENT_ID = 'test-client-id';
  process.env.COGNITO_REGION = 'us-east-1';
});

describe('JwtStrategy.validate()', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    strategy = new JwtStrategy();
  });

  // ── Happy path ──────────────────────────────────────────────────────────

  it('extracts user fields from a valid Cognito payload with cognito:groups', () => {
    const payload = {
      sub: 'user-123',
      email: 'nurse@raaya.sa',
      'cognito:groups': ['Nurse', 'ClinicalStaff'],
      'custom:facilityId': 'facility-abc',
    };

    const result = strategy.validate(payload);

    expect(result).toEqual({
      userId: 'user-123',
      email: 'nurse@raaya.sa',
      roles: ['Nurse', 'ClinicalStaff'],
      facilityId: 'facility-abc',
    });
  });

  // ── custom:role fallback ────────────────────────────────────────────────

  it('falls back to custom:role when cognito:groups is absent', () => {
    const payload = {
      sub: 'user-456',
      email: 'admin@raaya.sa',
      'custom:role': 'Admin',
      'custom:facilityId': 'facility-xyz',
    };

    const result = strategy.validate(payload);

    expect(result.roles).toEqual(['Admin']);
  });

  it('falls back to custom:role when cognito:groups is empty', () => {
    const payload = {
      sub: 'user-789',
      email: 'doctor@raaya.sa',
      'cognito:groups': [],
      'custom:role': 'Doctor',
      'custom:facilityId': 'facility-xyz',
    };

    const result = strategy.validate(payload);

    expect(result.roles).toEqual(['Doctor']);
  });

  // ── Empty roles ─────────────────────────────────────────────────────────

  it('returns empty roles when neither cognito:groups nor custom:role exists', () => {
    const payload = {
      sub: 'user-000',
      email: 'nobody@raaya.sa',
      'custom:facilityId': 'facility-abc',
    };

    const result = strategy.validate(payload);

    expect(result.roles).toEqual([]);
  });

  // ── Null / undefined payload ────────────────────────────────────────────

  it('throws UnauthorizedException for null payload', () => {
    expect(() => strategy.validate(null as any)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException for undefined payload', () => {
    expect(() => strategy.validate(undefined as any)).toThrow(
      UnauthorizedException,
    );
  });

  // ── REGRESSION: missing facilityId ──────────────────────────────────────
  // A JWT without custom:facilityId would pass through as undefined,
  // silently bypassing every facility-scoped SQL query.

  it('throws UnauthorizedException when custom:facilityId is missing', () => {
    const payload = {
      sub: 'user-bad',
      email: 'hacker@evil.com',
      'cognito:groups': ['Admin'],
      // no custom:facilityId
    };

    expect(() => strategy.validate(payload as any)).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when custom:facilityId is empty string', () => {
    const payload = {
      sub: 'user-bad',
      email: 'hacker@evil.com',
      'cognito:groups': ['Admin'],
      'custom:facilityId': '',
    };

    expect(() => strategy.validate(payload as any)).toThrow(
      UnauthorizedException,
    );
  });
});
