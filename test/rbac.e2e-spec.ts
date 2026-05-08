/**
 * US-02-06 – Role-based decorators and tests on protected routes (e2e)
 *
 * Acceptance criteria:
 *  - Admin-only endpoints reject the wrong roles (e.g. Nurse, Doctor)
 *  - Clinical-only endpoints reject non-clinical roles (e.g. Admin)
 *  - Facility-scoped access is enforced (FacilityManager only)
 *  - Results are demonstrated through automated tests
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  Controller,
  Get,
  UseGuards,
  Module,
} from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { App } from 'supertest/types';
import { createServer, Server } from 'node:http';
import { createSign, generateKeyPairSync, KeyObject } from 'node:crypto';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';

import { JwtStrategy } from '../src/auth/jwt.strategy';
import { RolesGuard } from '../src/auth/roles.guard';
import { Roles } from '../src/auth/roles.decorator';

// ── Minimal test controllers that mirror real protected routes ─────────────

@Controller('admin')
class AdminController {
  @Get('settings')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  getSettings() {
    return { data: 'admin-settings' };
  }
}

@Controller('clinical')
class ClinicalController {
  @Get('records')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Doctor', 'Nurse', 'ClinicalStaff')
  getRecords() {
    return { data: 'clinical-records' };
  }
}

@Controller('facility')
class FacilityController {
  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('FacilityManager')
  getDashboard() {
    return { data: 'facility-dashboard' };
  }
}

@Module({
  imports: [PassportModule],
  controllers: [AdminController, ClinicalController, FacilityController],
  providers: [JwtStrategy, Reflector, RolesGuard],
})
class RbacTestModule {}

// ── JWT helpers ────────────────────────────────────────────────────────────

const testUserPoolId = 'us-east-1_rbacTestPool';
const testClientId = 'rbac-test-client';
const testIssuer = `https://cognito-idp.us-east-1.amazonaws.com/${testUserPoolId}`;
const testKeyId = 'rbac-key-id';

const base64Url = (value: Buffer | string): string =>
  Buffer.from(value).toString('base64url');

const signJwt = (
  privateKey: KeyObject,
  payload: Record<string, unknown>,
): string => {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', kid: testKeyId, typ: 'JWT' };
  const claims = {
    iss: testIssuer,
    aud: testClientId,
    iat: now,
    exp: now + 300,
    ...payload,
  };

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(claims),
  )}`;
  const signer = createSign('RSA-SHA256');
  signer.update(unsignedToken);
  signer.end();

  return `${unsignedToken}.${base64Url(signer.sign(privateKey))}`;
};

const makeToken = (
  privateKey: KeyObject,
  role: string,
  facilityId = 'facility-1',
) =>
  signJwt(privateKey, {
    sub: `user-${role.toLowerCase()}`,
    email: `${role.toLowerCase()}@raaya.sa`,
    'custom:role': role,
    'custom:facilityId': facilityId,
  });

// ── Test suite ─────────────────────────────────────────────────────────────

describe('RBAC – role-based decorators on protected routes (e2e)', () => {
  let app: INestApplication<App>;
  let jwksServer: Server;
  let privateKey: KeyObject;

  let originalUserPoolId: string | undefined;
  let originalClientId: string | undefined;
  let originalJwksUri: string | undefined;

  beforeAll(async () => {
    originalUserPoolId = process.env.COGNITO_USER_POOL_ID;
    originalClientId = process.env.COGNITO_CLIENT_ID;
    originalJwksUri = process.env.COGNITO_JWKS_URI;

    // Generate a fresh RSA key-pair for this suite
    const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    privateKey = keyPair.privateKey;
    const publicJwk = keyPair.publicKey.export({ format: 'jwk' });

    const jwk = {
      ...publicJwk,
      alg: 'RS256',
      kid: testKeyId,
      use: 'sig',
    };

    // Spin up a local JWKS server
    jwksServer = createServer((req, res) => {
      if (req.url !== '/.well-known/jwks.json') {
        res.writeHead(404).end();
        return;
      }
      res
        .writeHead(200, { 'content-type': 'application/json' })
        .end(JSON.stringify({ keys: [jwk] }));
    });

    await new Promise<void>((resolve) => {
      jwksServer.listen(0, '127.0.0.1', resolve);
    });

    const address = jwksServer.address();
    if (!address || typeof address === 'string') {
      throw new Error('Unable to start local JWKS server');
    }

    process.env.COGNITO_USER_POOL_ID = testUserPoolId;
    process.env.COGNITO_CLIENT_ID = testClientId;
    process.env.COGNITO_JWKS_URI = `http://127.0.0.1:${address.port}/.well-known/jwks.json`;
  });

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

  afterAll(async () => {
    process.env.COGNITO_USER_POOL_ID = originalUserPoolId;
    process.env.COGNITO_CLIENT_ID = originalClientId;
    process.env.COGNITO_JWKS_URI = originalJwksUri;

    await new Promise<void>((resolve, reject) => {
      jwksServer.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // ── Unauthenticated requests ─────────────────────────────────────────
  describe('Unauthenticated requests', () => {
    it('rejects /admin/settings without a token (401)', () =>
      request(app.getHttpServer()).get('/admin/settings').expect(401));

    it('rejects /clinical/records without a token (401)', () =>
      request(app.getHttpServer()).get('/clinical/records').expect(401));

    it('rejects /facility/dashboard without a token (401)', () =>
      request(app.getHttpServer()).get('/facility/dashboard').expect(401));
  });

  // ── Admin-only endpoint ──────────────────────────────────────────────
  describe('Admin-only endpoint (/admin/settings)', () => {
    it('allows Admin users (200)', () => {
      const token = makeToken(privateKey, 'Admin');
      return request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({ data: 'admin-settings' });
    });

    it('rejects Nurse users (403)', () => {
      const token = makeToken(privateKey, 'Nurse');
      return request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects Doctor users (403)', () => {
      const token = makeToken(privateKey, 'Doctor');
      return request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects ClinicalStaff users (403)', () => {
      const token = makeToken(privateKey, 'ClinicalStaff');
      return request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects FacilityManager users (403)', () => {
      const token = makeToken(privateKey, 'FacilityManager');
      return request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ── Clinical-only endpoint ───────────────────────────────────────────
  describe('Clinical-only endpoint (/clinical/records)', () => {
    it.each(['Doctor', 'Nurse', 'ClinicalStaff'])(
      'allows %s users (200)',
      (role) => {
        const token = makeToken(privateKey, role);
        return request(app.getHttpServer())
          .get('/clinical/records')
          .set('Authorization', `Bearer ${token}`)
          .expect(200)
          .expect({ data: 'clinical-records' });
      },
    );

    it('rejects Admin users from clinical-only endpoint (403)', () => {
      const token = makeToken(privateKey, 'Admin');
      return request(app.getHttpServer())
        .get('/clinical/records')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects FacilityManager from clinical-only endpoint (403)', () => {
      const token = makeToken(privateKey, 'FacilityManager');
      return request(app.getHttpServer())
        .get('/clinical/records')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ── Facility-scoped endpoint ─────────────────────────────────────────
  describe('Facility-scoped endpoint (/facility/dashboard)', () => {
    it('allows FacilityManager users (200)', () => {
      const token = makeToken(privateKey, 'FacilityManager');
      return request(app.getHttpServer())
        .get('/facility/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect({ data: 'facility-dashboard' });
    });

    it('rejects Admin from facility-scoped endpoint (403)', () => {
      const token = makeToken(privateKey, 'Admin');
      return request(app.getHttpServer())
        .get('/facility/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('rejects Nurse from facility-scoped endpoint (403)', () => {
      const token = makeToken(privateKey, 'Nurse');
      return request(app.getHttpServer())
        .get('/facility/dashboard')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });
});
