import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Roles, ROLES_KEY } from './roles.decorator';

// ── Typed metadata helpers (avoids @typescript-eslint/unbound-method) ─────
const defineRoles = (target: object, roles: string[]): void => {
  Reflect.defineMetadata(ROLES_KEY, roles, target);
};

const getRoles = (target: object): string[] =>
  (Reflect.getMetadata(ROLES_KEY, target) as string[] | undefined) ?? [];

// ── Helper: build a typed fake ExecutionContext ────────────────────────────
const buildContext = (
  userRoles: string[],
  handlerRoles?: string[],
): ExecutionContext => {
  const mockHandler = (): void => {};
  const mockClass = class {};

  if (handlerRoles) {
    defineRoles(mockHandler, handlerRoles);
  }

  return {
    getHandler: () => mockHandler,
    getClass: () => mockClass,
    switchToHttp: () => ({
      getRequest: () => ({ user: { roles: userRoles } }),
    }),
  } as unknown as ExecutionContext;
};

// ── Roles decorator ────────────────────────────────────────────────────────

describe('Roles decorator', () => {
  it('attaches the correct roles metadata to the handler', () => {
    const target = {};
    // Use an arrow fn so ESLint doesn't flag it as an unbound method
    const handler = () => {};
    const descriptor = { value: handler };
    Roles('Admin', 'Doctor')(target, 'handler', descriptor);

    expect(getRoles(handler)).toEqual(['Admin', 'Doctor']);
  });

  it('accepts a single role', () => {
    const target = {};
    const handler = () => {};
    const descriptor = { value: handler };
    Roles('Admin')(target, 'handler', descriptor);

    expect(getRoles(handler)).toEqual(['Admin']);
  });
});

// ── RolesGuard ─────────────────────────────────────────────────────────────

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  // ── No @Roles decorator ────────────────────────────────────────────────
  describe('when no @Roles metadata is present', () => {
    it('allows access regardless of user role', () => {
      const ctx = buildContext(['Nurse']);
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ── Admin-only endpoint ────────────────────────────────────────────────
  describe('Admin-only endpoints', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Admin']);
    });

    it('allows Admin users', () => {
      const ctx = buildContext(['Admin'], ['Admin']);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects Doctor users', () => {
      const ctx = buildContext(['Doctor'], ['Admin']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('rejects Nurse users', () => {
      const ctx = buildContext(['Nurse'], ['Admin']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('rejects ClinicalStaff users', () => {
      const ctx = buildContext(['ClinicalStaff'], ['Admin']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ── Clinical-only endpoint ─────────────────────────────────────────────
  describe('Clinical-only endpoints', () => {
    beforeEach(() => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['Doctor', 'Nurse', 'ClinicalStaff']);
    });

    it.each(['Doctor', 'Nurse', 'ClinicalStaff'])('allows %s users', (role) => {
      const ctx = buildContext([role], ['Doctor', 'Nurse', 'ClinicalStaff']);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects Admin from clinical-only endpoint', () => {
      const ctx = buildContext(['Admin'], ['Doctor', 'Nurse', 'ClinicalStaff']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('rejects unknown roles from clinical-only endpoint', () => {
      const ctx = buildContext(
        ['Unknown'],
        ['Doctor', 'Nurse', 'ClinicalStaff'],
      );
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ── Facility-scoped endpoint ───────────────────────────────────────────
  describe('Facility-scoped role enforcement', () => {
    it('allows FacilityManager', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['FacilityManager']);
      const ctx = buildContext(['FacilityManager'], ['FacilityManager']);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('denies Nurse from facility-scoped endpoint', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue(['FacilityManager']);
      const ctx = buildContext(['Nurse'], ['FacilityManager']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ── Error message ──────────────────────────────────────────────────────
  it('throws ForbiddenException with "Access denied"', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['Admin']);
    const ctx = buildContext(['Nurse'], ['Admin']);
    expect(() => guard.canActivate(ctx)).toThrow('Access denied');
  });
});
