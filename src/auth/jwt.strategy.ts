import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

interface JwtPayload {
  sub: string;
  email: string;
  'custom:role': string;
  'custom:facilityId': string;
  'cognito:groups'?: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const region = process.env.COGNITO_REGION ?? 'us-east-1';
    const issuer = process.env.COGNITO_ISSUER
      ?? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;
    const jwksUri = process.env.COGNITO_JWKS_URI
      ?? `${issuer}/.well-known/jwks.json`;
    const audience = process.env.COGNITO_CLIENT_ID;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri,
      }),
      audience,
      issuer,
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayload) {
    if (!payload) throw new UnauthorizedException();

    return {
      userId: payload.sub,
      email: payload.email,
      roles: payload['cognito:groups'] ?? [],
      facilityId: payload['custom:facilityId'],
    };
  }
}