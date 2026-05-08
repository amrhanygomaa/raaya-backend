import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

// ── Helper: build a fake ExecutionContext ──────────────────────────────────
const buildContext = (
  userRole: string,
  handlerRoles?: string[],
): ExecutionContext => {
  const mockHandler = () => {};
  if (handlerRoles) {
    Reflect.defineMetadata('roles', handlerRoles, mockHandler);
  }

  return {
    getHandler: () => mockHandler,
    switchToHttp: () => ({
      getRequest: () => ({ user: { role: userRole } }),
    }),
  } as unknown as ExecutionContext;
};

describe('Roles decorator', () => {
  it('attaches the correct roles metadata to the handler', () => {
    const target = {};
    const descriptor = { value: function handler() {} };
    Roles('Admin', 'Doctor')(target, 'handler', descriptor);

    const meta = Reflect.getMetadata('roles', descriptor.value);
    expect(meta).toEqual(['Admin', 'Doctor']);
  });

  it('accepts a single role', () => {
    const target = {};
    const descriptor = { value: function handler() {} };
    Roles('Admin')(target, 'handler', descriptor);

    const meta = Reflect.getMetadata('roles', descriptor.value);
    expect(meta).toEqual(['Admin']);
  });
});

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
      const ctx = buildContext('Nurse');
      jest.spyOn(reflector, 'get').mockReturnValue(undefined);

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // ── Admin-only endpoint ────────────────────────────────────────────────
  describe('Admin-only endpoints', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockReturnValue(['Admin']);
    });

    it('allows Admin users', () => {
      const ctx = buildContext('Admin', ['Admin']);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects Doctor users with ForbiddenException', () => {
      const ctx = buildContext('Doctor', ['Admin']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('rejects Nurse users with ForbiddenException', () => {
      const ctx = buildContext('Nurse', ['Admin']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('rejects ClinicalStaff users with ForbiddenException', () => {
      const ctx = buildContext('ClinicalStaff', ['Admin']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ── Clinical-only endpoint (Doctor | Nurse | ClinicalStaff) ───────────
  describe('Clinical-only endpoints', () => {
    beforeEach(() => {
      jest.spyOn(reflector, 'get').mockReturnValue(['Doctor', 'Nurse', 'ClinicalStaff']);
    });

    it('allows Doctor users', () => {
      const ctx = buildContext('Doctor', ['Doctor', 'Nurse', 'ClinicalStaff']);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows Nurse users', () => {
      const ctx = buildContext('Nurse', ['Doctor', 'Nurse', 'ClinicalStaff']);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows ClinicalStaff users', () => {
      const ctx = buildContext('ClinicalStaff', ['Doctor', 'Nurse', 'ClinicalStaff']);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rejects Admin users from clinical-only endpoint', () => {
      const ctx = buildContext('Admin', ['Doctor', 'Nurse', 'ClinicalStaff']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('rejects unknown roles from clinical-only endpoint', () => {
      const ctx = buildContext('Unknown', ['Doctor', 'Nurse', 'ClinicalStaff']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ── Facility-scoped access: ensure the role check is role-agnostic ─────
  describe('Facility-scoped role enforcement', () => {
    it('allows a user whose role is in the allowed list', () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['FacilityManager']);
      const ctx = buildContext('FacilityManager', ['FacilityManager']);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('denies a user whose facility role is not in the allowed list', () => {
      jest.spyOn(reflector, 'get').mockReturnValue(['FacilityManager']);
      const ctx = buildContext('Nurse', ['FacilityManager']);
      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  // ── Error message ──────────────────────────────────────────────────────
  it('throws ForbiddenException with the expected Arabic message', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(['Admin']);
    const ctx = buildContext('Nurse', ['Admin']);

    expect(() => guard.canActivate(ctx)).toThrow('ليس لديك صلاحية للوصول');
  });
});
