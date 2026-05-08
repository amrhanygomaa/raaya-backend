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
    // 👇 ثابتين مؤقتًا للتأكد إن JWT شغال
    const issuer =
      'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_MqQaZdJDT';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,

      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/.well-known/jwks.json`,
      }),

      // 👇 Cognito App Client ID
      audience: '2370bcb5pl0jau4bvk88bu1rt3',

      issuer,

      algorithms: ['RS256'],
    });
  }

 validate(payload: any) {
  console.log('JWT PAYLOAD:', payload);

  if (!payload) {
    throw new UnauthorizedException();
  }

  return {
    userId: payload.sub,
    email: payload.email,

    // 👇 ناخد roles من Cognito Groups
    roles: payload['cognito:groups'] || [],

    facilityId: payload['custom:facilityId'],
  };
}
}