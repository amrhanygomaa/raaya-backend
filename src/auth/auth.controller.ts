import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

interface AuthRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user info from JWT.',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'admin-seed' },
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
