import {
  Controller,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
export class UsersController {

  // ✅ أي يوزر authenticated
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() req) {
    return {
      message: 'Authenticated user',
      user: req.user,
    };
  }

  // ✅ admin only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin')
  getAdmin() {
    return {
      message: 'Welcome Admin',
    };
  }

  // ✅ clinical only
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('clinical')
  @Get('clinical')
  getClinical() {
    return {
      message: 'Welcome Clinical',
    };
  }
}