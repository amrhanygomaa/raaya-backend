import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VolunteersService } from './volunteers.service';

@ApiTags('Volunteers (Public)')
@Controller()
export class VolunteerPublicController {
  constructor(private readonly volunteersService: VolunteersService) {}

  @Get('v/:token')
  @ApiOperation({
    summary: 'Read a public volunteer profile by share token',
    description:
      'No authentication required. Returns only profile fields intended for public sharing.',
  })
  @ApiParam({ name: 'token', description: 'Volunteer public profile token' })
  @ApiResponse({
    status: 200,
    description: 'Sanitized volunteer profile.',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        bio: { type: 'string', nullable: true },
        location: { type: 'string', nullable: true },
        skills: { type: 'array', items: { type: 'string' } },
        hoursLogged: { type: 'number' },
        socialLinks: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        cvFileUrl: { type: 'string', nullable: true },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Token not found, expired, or revoked.',
  })
  async getPublicProfile(@Param('token') token: string) {
    return this.volunteersService.getPublicProfileByToken(token);
  }
}
