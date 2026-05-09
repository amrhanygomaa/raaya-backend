import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  // ✅ أي يوزر authenticated
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated user object.',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', example: 'Authenticated user' },
        user: {
          type: 'object',
          properties: {
            userId: { type: 'string', example: 'nurse-seed' },
            email: { type: 'string', example: 'nurse@raaya.demo' },
            roles: {
              type: 'array',
              items: { type: 'string' },
              example: ['Nurse'],
            },
            facilityId: { type: 'string', example: 'facility-demo' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMe(@Request() req: AuthenticatedRequest) {
    return {
      message: 'Authenticated user',
      user: req.user,
    };
  }

  // ✅ admin only
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  @Get('admin')
  @ApiOperation({ summary: 'Admin-only test endpoint' })
  @ApiResponse({ status: 200, description: 'Welcome Admin message.' })
  @ApiResponse({ status: 403, description: 'Forbidden – Admin role required.' })
  getAdmin() {
    return { message: 'Welcome Admin' };
  }

  // ✅ clinical only
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Doctor', 'Nurse', 'ClinicalStaff')
  @Get('clinical')
  @ApiOperation({ summary: 'Clinical staff test endpoint' })
  @ApiResponse({ status: 200, description: 'Welcome Clinical message.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden – clinical role required.',
  })
  getClinical() {
    return { message: 'Welcome Clinical' };
  }
}
