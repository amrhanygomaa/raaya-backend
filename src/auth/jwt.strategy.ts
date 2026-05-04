/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

interface JwtPayload {
  sub: string;
  email: string;
  'custom:role': string;
  'custom:facilityId': string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}/.well-known/jwks.json`,
      }),
      audience: process.env.COGNITO_CLIENT_ID,
      issuer: `https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
      algorithms: ['RS256'],
    });
  }

  validate(payload: JwtPayload) {
    if (!payload) throw new UnauthorizedException();
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload['custom:role'],
      facilityId: payload['custom:facilityId'],
    };
  }
}