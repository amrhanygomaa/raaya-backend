/**
 * US-02-06 – Role-based decorators and tests on protected routes (e2e)
 *
 * Uses a lightweight TestAuthGuard that decodes JWT payloads without
 * signature verification, so the suite tests RBAC in isolation from
 * the real Cognito / JWKS infrastructure.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Get,
  UseGuards,
  Module,
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { App } from 'supertest/types';

import { RolesGuard } from '../src/auth/roles.guard';
import { Roles } from '../src/auth/roles.decorator';

// ── Test-only Auth Guard (no signature verification needed) ───────────────
@Injectable()
class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user: unknown;
    }>();

    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    try {
      const [, payloadB64] = auth.slice(7).split('.');
      const payload = JSON.parse(
        Buffer.from(payloadB64, 'base64url').toString('utf8'),
      ) as Record<string, unknown>;

      req.user = {
        userId: payload['sub'],
        email: payload['email'],
        roles: (payload['cognito:groups'] as string[]) ?? [],
        facilityId: payload['custom:facilityId'],
      };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

// ── Helper: build an unsigned test JWT ───────────────────────────────────
const makeToken = (roles: string[], facilityId = 'facility-1'): string => {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: `user-${roles[0]?.toLowerCase() ?? 'unknown'}`,
      email: `${roles[0]?.toLowerCase() ?? 'user'}@raaya.sa`,
      'cognito:groups': roles,
      'custom:facilityId': facilityId,
    }),
  ).toString('base64url');
  return `${header}.${payload}.`;
};

// ── Minimal test controllers mirroring real protected routes ──────────────
@Controller('admin')
class AdminController {
  @Get('settings')
  @UseGuards(TestAuthGuard, RolesGuard)
  @Roles('Admin')
  getSettings() {
    return { data: 'admin-settings' };
  }
}

@Controller('clinical')
class ClinicalController {
  @Get('records')
  @UseGuards(TestAuthGuard, RolesGuard)
  @Roles('Doctor', 'Nurse', 'ClinicalStaff')
  getRecords() {
    return { data: 'clinical-records' };
  }
}

@Controller('facility')
class FacilityController {
  @Get('dashboard')
  @UseGuards(TestAuthGuard, RolesGuard)
  @Roles('FacilityManager')
  getDashboard() {
    return { data: 'facility-dashboard' };
  }
}

@Module({
  controllers: [AdminController, ClinicalController, FacilityController],
  providers: [Reflector, RolesGuard, TestAuthGuard],
})
class RbacTestModule {}

// ── Test suite ────────────────────────────────────────────────────────────

describe('RBAC – role-based decorators on protected routes (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RbacTestModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ── Unauthenticated ────────────────────────────────────────────────────
  describe('Unauthenticated requests', () => {
    it('rejects /admin/settings without a token (401)', () =>
      request(app.getHttpServer()).get('/admin/settings').expect(401));

    it('rejects /clinical/records without a token (401)', () =>
      request(app.getHttpServer()).get('/clinical/records').expect(401));

    it('rejects /facility/dashboard without a token (401)', () =>
      request(app.getHttpServer()).get('/facility/dashboard').expect(401));
  });

  // ── Admin-only endpoint ────────────────────────────────────────────────
  describe('Admin-only endpoint (/admin/settings)', () => {
    it('allows Admin (200)', () =>
      request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${makeToken(['Admin'])}`)
        .expect(200)
        .expect({ data: 'admin-settings' }));

    it.each(['Nurse', 'Doctor', 'ClinicalStaff', 'FacilityManager'])(
      'rejects %s (403)',
      (role) =>
        request(app.getHttpServer())
          .get('/admin/settings')
          .set('Authorization', `Bearer ${makeToken([role])}`)
          .expect(403),
    );
  });

  // ── Clinical-only endpoint ─────────────────────────────────────────────
  describe('Clinical-only endpoint (/clinical/records)', () => {
    it.each(['Doctor', 'Nurse', 'ClinicalStaff'])(
      'allows %s (200)',
      (role) =>
        request(app.getHttpServer())
          .get('/clinical/records')
          .set('Authorization', `Bearer ${makeToken([role])}`)
          .expect(200)
          .expect({ data: 'clinical-records' }),
    );

    it.each(['Admin', 'FacilityManager'])(
      'rejects %s (403)',
      (role) =>
        request(app.getHttpServer())
          .get('/clinical/records')
          .set('Authorization', `Bearer ${makeToken([role])}`)
          .expect(403),
    );
  });

  // ── Facility-scoped endpoint ───────────────────────────────────────────
  describe('Facility-scoped endpoint (/facility/dashboard)', () => {
    it('allows FacilityManager (200)', () =>
      request(app.getHttpServer())
        .get('/facility/dashboard')
        .set('Authorization', `Bearer ${makeToken(['FacilityManager'])}`)
        .expect(200)
        .expect({ data: 'facility-dashboard' }));

    it.each(['Admin', 'Nurse', 'Doctor'])(
      'rejects %s (403)',
      (role) =>
        request(app.getHttpServer())
          .get('/facility/dashboard')
          .set('Authorization', `Bearer ${makeToken([role])}`)
          .expect(403),
    );
  });
});
