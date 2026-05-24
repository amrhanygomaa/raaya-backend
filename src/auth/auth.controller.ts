import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import {
  AdminAddUserToGroupCommand,
  AdminConfirmSignUpCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ForgotPasswordCommand,
  InitiateAuthCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { createHmac } from 'crypto';

interface AuthRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

interface LoginBody {
  email: string;
  password: string;
}

const decodeJwtPayload = (token: string): Record<string, unknown> => {
  const [, payload] = token.split('.');
  if (!payload) return {};

  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    '=',
  );

  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<
      string,
      unknown
    >;
  } catch {
    return {};
  }
};

const buildSecretHash = (
  username: string,
  clientId: string,
  clientSecret?: string,
): string | undefined => {
  if (!clientSecret) return undefined;

  return createHmac('sha256', clientSecret)
    .update(`${username}${clientId}`)
    .digest('base64');
};

const getBodyString = (body: Record<string, unknown>, key: string): string => {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly cognito = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION ?? process.env.AWS_REGION ?? 'us-east-1',
  });

  // الأدوار المسموح بها للتسجيل الذاتي (الباقي يُنشأ من Admin Console)
  private readonly SELF_SIGNUP_ROLES = ['Family', 'Volunteer'];

  @Post('register')
  @ApiOperation({
    summary: 'Self sign-up for Family / Volunteer accounts',
    description:
      'Creates a new Cognito user, auto-confirms it, adds the resident facility, ' +
      'and assigns the requested role.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name', 'role'],
      properties: {
        email: { type: 'string', example: 'newfamily@raaya.demo' },
        password: { type: 'string', example: 'Password123!' },
        name: { type: 'string', example: 'Sarah Al-Rashid' },
        role: {
          type: 'string',
          example: 'Family',
          enum: ['Family', 'Volunteer'],
        },
        phone: { type: 'string', example: '+201112223334' },
        facilityId: { type: 'string', example: 'facility-demo' },
        linkedResidentId: {
          type: 'string',
          example: 'a1b2c3d4-0000-0000-0000-000000000001',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'User created + confirmed.' })
  @ApiResponse({ status: 400, description: 'Missing fields / invalid role.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async register(@Body() body: Record<string, unknown>) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!userPoolId || !clientId) {
      throw new InternalServerErrorException('Cognito is not configured');
    }

    const email = getBodyString(body, 'email');
    const password = getBodyString(body, 'password');
    const name = getBodyString(body, 'name');
    const role = getBodyString(body, 'role');
    const phone =
      typeof body.phone === 'string' ? body.phone.trim() : undefined;
    const facilityId =
      typeof body.facilityId === 'string' && body.facilityId.trim()
        ? body.facilityId.trim()
        : null;

    if (!facilityId) {
      throw new BadRequestException('facilityId is required');
    }
    const linkedResidentId =
      typeof body.linkedResidentId === 'string'
        ? body.linkedResidentId
        : undefined;

    if (!email || !password || !name || !role) {
      throw new BadRequestException('email, password, name, role are required');
    }
    if (!this.SELF_SIGNUP_ROLES.includes(role)) {
      throw new BadRequestException(
        `Self sign-up is only allowed for: ${this.SELF_SIGNUP_ROLES.join(', ')}`,
      );
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const secretHash = buildSecretHash(
      email,
      clientId,
      process.env.COGNITO_CLIENT_SECRET,
    );

    try {
      // 1) sign up
      await this.cognito.send(
        new SignUpCommand({
          ClientId: clientId,
          Username: email,
          Password: password,
          ...(secretHash ? { SecretHash: secretHash } : {}),
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: name },
            { Name: 'custom:role', Value: role },
            { Name: 'custom:facilityId', Value: facilityId },
            ...(phone ? [{ Name: 'phone_number', Value: phone }] : []),
            ...(linkedResidentId
              ? [{ Name: 'custom:linkedResidentId', Value: linkedResidentId }]
              : []),
          ],
        }),
      );

      // 2) auto-confirm
      await this.cognito.send(
        new AdminConfirmSignUpCommand({
          UserPoolId: userPoolId,
          Username: email,
        }),
      );

      // 3) mark email as verified so it can sign in
      await this.cognito
        .send(
          new AdminUpdateUserAttributesCommand({
            UserPoolId: userPoolId,
            Username: email,
            UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
          }),
        )
        .catch(() => undefined);

      // 4) try add to Cognito group (best-effort; ignore if group missing)
      await this.cognito
        .send(
          new AdminAddUserToGroupCommand({
            UserPoolId: userPoolId,
            Username: email,
            GroupName: role,
          }),
        )
        .catch(() => undefined);

      return {
        status: 'ok',
        email,
        role,
        facilityId,
        message: 'Account created and confirmed. You can sign in now.',
      };
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err.name === 'UsernameExistsException') {
        throw new ConflictException('Email already exists');
      }
      if (err.name === 'InvalidPasswordException') {
        throw new BadRequestException(
          err.message ?? 'Password does not meet policy',
        );
      }
      if (err.name === 'InvalidParameterException') {
        throw new BadRequestException(err.message ?? 'Invalid parameter');
      }
      console.error('[Auth][register] failed:', err);
      throw new InternalServerErrorException(
        err.message ?? 'Registration failed',
      );
    }
  }

  @Post('register-admin')
  @ApiOperation({
    summary: 'Register the first Admin for a new facility (no JWT required)',
    description:
      'Creates an Admin Cognito user and links them to a facilityId. ' +
      'Requires a setup secret (ADMIN_REGISTRATION_SECRET env var) to prevent abuse.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password', 'name', 'facilityId', 'setupSecret'],
      properties: {
        email: { type: 'string', example: 'admin@mycare.demo' },
        password: { type: 'string', example: 'Password123!' },
        name: { type: 'string', example: 'أحمد المدير' },
        facilityId: { type: 'string', example: 'mycare-facility-001' },
        facilityName: { type: 'string', example: 'دار رعاية الأمل' },
        setupSecret: {
          type: 'string',
          description: 'Must match ADMIN_REGISTRATION_SECRET env var',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Admin account created.' })
  @ApiResponse({ status: 401, description: 'Invalid setup secret.' })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async registerAdmin(@Body() body: Record<string, unknown>) {
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.COGNITO_CLIENT_ID;
    const adminSecret = process.env.ADMIN_REGISTRATION_SECRET;

    if (!userPoolId || !clientId) {
      throw new InternalServerErrorException('Cognito is not configured');
    }

    // التحقق من الـ setup secret لمنع الإساءة
    const providedSecret = getBodyString(body, 'setupSecret');
    if (!adminSecret || !providedSecret || providedSecret !== adminSecret) {
      throw new UnauthorizedException('Invalid setup secret');
    }

    const email = getBodyString(body, 'email');
    const password = getBodyString(body, 'password');
    const name = getBodyString(body, 'name');
    const facilityId = getBodyString(body, 'facilityId');
    const facilityName = getBodyString(body, 'facilityName');

    if (!email || !password || !name || !facilityId) {
      throw new BadRequestException(
        'email, password, name, facilityId are required',
      );
    }
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const secretHash = buildSecretHash(
      email,
      clientId,
      process.env.COGNITO_CLIENT_SECRET,
    );

    try {
      await this.cognito.send(
        new SignUpCommand({
          ClientId: clientId,
          Username: email,
          Password: password,
          ...(secretHash ? { SecretHash: secretHash } : {}),
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: name },
            { Name: 'custom:role', Value: 'Admin' },
            { Name: 'custom:facilityId', Value: facilityId },
            ...(facilityName
              ? [{ Name: 'custom:facilityName', Value: facilityName }]
              : []),
          ],
        }),
      );

      await this.cognito.send(
        new AdminConfirmSignUpCommand({
          UserPoolId: userPoolId,
          Username: email,
        }),
      );

      await this.cognito
        .send(
          new AdminUpdateUserAttributesCommand({
            UserPoolId: userPoolId,
            Username: email,
            UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
          }),
        )
        .catch(() => undefined);

      await this.cognito
        .send(
          new AdminAddUserToGroupCommand({
            UserPoolId: userPoolId,
            Username: email,
            GroupName: 'Admin',
          }),
        )
        .catch(() => undefined);

      return {
        status: 'ok',
        email,
        role: 'Admin',
        facilityId,
        message: 'Admin account created. You can sign in now.',
      };
    } catch (error: unknown) {
      const err = error as { name?: string; message?: string };
      if (err.name === 'UsernameExistsException') {
        throw new ConflictException('Email already exists');
      }
      if (err.name === 'InvalidPasswordException') {
        throw new BadRequestException(
          err.message ?? 'Password does not meet policy',
        );
      }
      console.error('[Auth][register-admin] failed:', err);
      throw new InternalServerErrorException(
        err.message ?? 'Registration failed',
      );
    }
  }

  @Post('login')
  @ApiOperation({
    summary: 'Login through AWS Cognito and return a JWT for the mobile app',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', example: 'nurse@raaya.demo' },
        password: { type: 'string', example: 'Password123!' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Login accepted.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  async login(@Body() body: LoginBody) {
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      throw new InternalServerErrorException(
        'COGNITO_CLIENT_ID is not configured',
      );
    }

    const email = body.email?.trim();
    const password = body.password?.trim();
    if (!email || !password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const authParameters: Record<string, string> = {
      USERNAME: email,
      PASSWORD: password,
    };
    const secretHash = buildSecretHash(
      email,
      clientId,
      process.env.COGNITO_CLIENT_SECRET,
    );
    if (secretHash) authParameters.SECRET_HASH = secretHash;

    try {
      const result = await this.cognito.send(
        new InitiateAuthCommand({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: clientId,
          AuthParameters: authParameters,
        }),
      );

      const authResult = result.AuthenticationResult;
      const idToken = authResult?.IdToken;
      const cognitoAccessToken = authResult?.AccessToken;
      const accessToken = idToken ?? cognitoAccessToken;

      if (!accessToken) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const payload = decodeJwtPayload(accessToken);
      const groups = Array.isArray(payload['cognito:groups'])
        ? (payload['cognito:groups'] as string[])
        : [];
      const customRole =
        typeof payload['custom:role'] === 'string'
          ? payload['custom:role']
          : undefined;

      return {
        accessToken,
        idToken,
        cognitoAccessToken,
        refreshToken: authResult?.RefreshToken,
        expiresIn: authResult?.ExpiresIn,
        tokenType: authResult?.TokenType,
        user: {
          userId: payload.sub ?? '',
          email: payload.email ?? email,
          roles: groups.length > 0 ? groups : customRole ? [customRole] : [],
          facilityId: payload['custom:facilityId'] ?? '',
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid email or password');
    }
  }

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request a password reset code via email',
    description:
      'Triggers the Cognito ForgotPassword flow — sends a verification code to the user email.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email'],
      properties: {
        email: { type: 'string', example: 'nurse@raaya.demo' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Reset code sent.' })
  @ApiResponse({ status: 400, description: 'Missing email.' })
  async forgotPassword(@Body() body: Record<string, unknown>) {
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      throw new InternalServerErrorException('Cognito is not configured');
    }

    const email = getBodyString(body, 'email');
    if (!email) {
      throw new BadRequestException('email is required');
    }

    const secretHash = buildSecretHash(
      email,
      clientId,
      process.env.COGNITO_CLIENT_SECRET,
    );

    try {
      await this.cognito.send(
        new ForgotPasswordCommand({
          ClientId: clientId,
          Username: email,
          ...(secretHash ? { SecretHash: secretHash } : {}),
        }),
      );
      return { status: 'ok', message: 'Reset code sent to email.' };
    } catch (error) {
      const err = error as { name?: string; message?: string };
      if (err.name === 'UserNotFoundException') {
        // Don't reveal whether email exists
        return { status: 'ok', message: 'Reset code sent to email.' };
      }
      throw new BadRequestException(err.message ?? 'Failed to send reset code');
    }
  }

  @Post('confirm-forgot-password')
  @ApiOperation({
    summary: 'Confirm password reset with verification code',
    description:
      'Completes the Cognito ForgotPassword flow — sets a new password using the code.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'code', 'newPassword'],
      properties: {
        email: { type: 'string', example: 'nurse@raaya.demo' },
        code: { type: 'string', example: '123456' },
        newPassword: { type: 'string', example: 'NewPassword123!' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Password reset successful.' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code.' })
  async confirmForgotPassword(@Body() body: Record<string, unknown>) {
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      throw new InternalServerErrorException('Cognito is not configured');
    }

    const email = getBodyString(body, 'email');
    const code = getBodyString(body, 'code');
    const newPassword = getBodyString(body, 'newPassword');

    if (!email || !code || !newPassword) {
      throw new BadRequestException('email, code, newPassword are required');
    }
    if (newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    const secretHash = buildSecretHash(
      email,
      clientId,
      process.env.COGNITO_CLIENT_SECRET,
    );

    try {
      await this.cognito.send(
        new ConfirmForgotPasswordCommand({
          ClientId: clientId,
          Username: email,
          ConfirmationCode: code,
          Password: newPassword,
          ...(secretHash ? { SecretHash: secretHash } : {}),
        }),
      );
      return { status: 'ok', message: 'Password reset successful.' };
    } catch (error) {
      const err = error as { name?: string; message?: string };
      if (
        err.name === 'CodeMismatchException' ||
        err.name === 'ExpiredCodeException'
      ) {
        throw new BadRequestException('Invalid or expired verification code');
      }
      throw new BadRequestException(err.message ?? 'Password reset failed');
    }
  }

  @ApiBearerAuth()
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user info from JWT.',
    schema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          example: '8f77c6b4-0000-0000-0000-000000000001',
        },
        email: { type: 'string', example: 'admin@raaya.demo' },
        roles: { type: 'array', items: { type: 'string' }, example: ['Admin'] },
        facilityId: { type: 'string', example: 'facility-demo' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMe(@Request() req: AuthRequest) {
    return {
      userId: req.user.userId,
      email: req.user.email,
      roles: req.user.roles,
      facilityId: req.user.facilityId,
    };
  }
}
