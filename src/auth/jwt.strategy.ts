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
    const issuer = `https://cognito-idp.us-east-1.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri:
          process.env.COGNITO_JWKS_URI ?? `${issuer}/.well-known/jwks.json`,
      }),
      audience: process.env.COGNITO_CLIENT_ID,
      issuer,
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
