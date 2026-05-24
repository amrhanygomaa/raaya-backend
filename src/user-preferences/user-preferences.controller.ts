import { Body, Controller, Get, Put, Request, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserPreferencesService } from './user-preferences.service';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('User Preferences')
@ApiBearerAuth()
@Controller('user-preferences')
@UseGuards(AuthGuard('jwt'))
export class UserPreferencesController {
  constructor(private readonly service: UserPreferencesService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get the caller preferences (empty {} if never set)',
  })
  @ApiResponse({
    status: 200,
    description: 'UserPreferences object.',
    schema: {
      type: 'object',
      properties: { preferences: { type: 'object' } },
    },
  })
  async getMine(@Request() req: AuthenticatedRequest) {
    return this.service.getMine(req.user.facilityId, req.user.userId);
  }

  @Put('me')
  @ApiOperation({
    summary: 'Replace the caller preferences (full object overwrite)',
  })
  @ApiResponse({ status: 200, description: 'Stored UserPreferences.' })
  async upsert(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.service.upsert(req.user.facilityId, req.user.userId, dto);
  }
}
