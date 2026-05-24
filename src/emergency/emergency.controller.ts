import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { EmergencyService } from './emergency.service';
import { TriggerSosDto } from './dto/trigger-sos.dto';
import { RealtimeGateway } from '../gateway/realtime.gateway';

interface AuthenticatedRequest {
  user: { userId: string; email: string; roles: string[]; facilityId: string };
}

@ApiTags('Emergency')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('emergency')
export class EmergencyController {
  constructor(
    private readonly emergencyService: EmergencyService,
    private readonly gateway: RealtimeGateway,
  ) {}

  @Post('sos')
  @ApiOperation({ summary: 'Trigger an SOS emergency alert' })
  @ApiResponse({ status: 201, description: 'Alert created.' })
  async triggerSos(
    @Request() req: AuthenticatedRequest,
    @Body() dto: TriggerSosDto,
  ) {
    const alert = await this.emergencyService.triggerSos(
      req.user.facilityId,
      dto,
    );
    // بث فوري لكل المتصلين في الـ facility
    this.gateway.broadcastSos(
      req.user.facilityId,
      alert as unknown as Record<string, unknown>,
    );
    return alert;
  }

  @Get('active')
  @ApiOperation({ summary: 'List active emergency alerts for the facility' })
  @ApiResponse({ status: 200, description: 'Active alerts array.' })
  async findActive(@Request() req: AuthenticatedRequest) {
    return this.emergencyService.findActive(req.user.facilityId);
  }

  @Get()
  @ApiOperation({ summary: 'List all emergency alerts (newest first)' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Alerts array.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    return this.emergencyService.findAll(
      req.user.facilityId,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Resolve an emergency alert' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  @ApiResponse({ status: 200, description: 'Alert resolved.' })
  async resolve(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.emergencyService.resolve(
      req.user.facilityId,
      id,
      req.user.userId,
    );
  }
}
