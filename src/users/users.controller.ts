import { Controller, Get, Request, UseGuards } from '@nestjs/common';
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

@Controller('users')
export class UsersController {
  // ✅ أي يوزر authenticated
  @UseGuards(AuthGuard('jwt'))
  @Get('me')
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
  getAdmin() {
    return { message: 'Welcome Admin' };
  }

  // ✅ clinical only
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Doctor', 'Nurse', 'ClinicalStaff')
  @Get('clinical')
  getClinical() {
    return { message: 'Welcome Clinical' };
  }
}
