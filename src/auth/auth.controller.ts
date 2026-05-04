import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    getMe(@Request() req) {
        return {
            userId: req.user.userId,
            email: req.user.email,
            role: req.user.role,
            facilityId: req.user.facilityId,
        };
    }
}