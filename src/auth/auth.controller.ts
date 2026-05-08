import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface AuthRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@Controller('auth')
export class AuthController {
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getMe(@Request() req: AuthRequest) {
    return {
      userId: req.user.userId,
      email: req.user.email,
      roles: req.user.roles,
      facilityId: req.user.facilityId,
    };
  }
}
