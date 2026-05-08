import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createServer, Server } from 'node:http';
import { createSign, generateKeyPairSync, KeyObject } from 'node:crypto';
import { AppModule } from './../src/app.module';

const testUserPoolId = 'us-east-1_testPool';
const testClientId = 'test-client-id';
const testIssuer = `https://cognito-idp.us-east-1.amazonaws.com/${testUserPoolId}`;
const testKeyId = 'test-key-id';

const base64Url = (value: Buffer | string): string =>
  Buffer.from(value).toString('base64url');

const signJwt = (
  privateKey: KeyObject,
  payload: Record<string, unknown>,
): string => {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'RS256',
    kid: testKeyId,
    typ: 'JWT',
  };
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

describe('AuthModule (e2e)', () => {
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

    const keyPair = generateKeyPairSync('rsa', { modulusLength: 2048 });
    privateKey = keyPair.privateKey;
    const publicJwk = keyPair.publicKey.export({ format: 'jwk' });
    const jwk = {
      ...publicJwk,
      alg: 'RS256',
      kid: testKeyId,
      use: 'sig',
    };

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
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/auth/me returns 401 without a token', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('/auth/me returns 401 with an invalid token', () => {
    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid.jwt.token')
      .expect(401);
  });

  it('/auth/me exposes roles via cognito:groups', () => {
    const token = signJwt(privateKey, {
      sub: 'user-123',
      email: 'nurse@example.com',
      'cognito:groups': ['Nurse'],
      'custom:facilityId': 'facility-1',
    });

    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        userId: 'user-123',
        email: 'nurse@example.com',
        roles: ['Nurse'],
        facilityId: 'facility-1',
      });
  });

  it('/auth/me falls back to custom:role when no cognito:groups', () => {
    const token = signJwt(privateKey, {
      sub: 'user-456',
      email: 'doctor@example.com',
      'custom:role': 'Doctor',
      'custom:facilityId': 'facility-2',
    });

    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({
        userId: 'user-456',
        email: 'doctor@example.com',
        roles: ['Doctor'],
        facilityId: 'facility-2',
      });
  });

  afterEach(async () => {
    await app.close();
  });

  afterAll(async () => {
    process.env.COGNITO_USER_POOL_ID = originalUserPoolId;
    process.env.COGNITO_CLIENT_ID = originalClientId;
    process.env.COGNITO_JWKS_URI = originalJwksUri;

    await new Promise<void>((resolve, reject) => {
      jwksServer.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  });
});
