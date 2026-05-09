/**
 * US-06-01 – HealthController
 *
 * Exposes vital-sign recording, listing, alerts, and threshold management.
 *
 * Endpoints:
 *   POST   /health/vitals                     → Record vital signs (auto-alerts)
 *   GET    /health/vitals                     → List vitals (optional filters)
 *
 *   GET    /health/alerts                     → List vital alerts
 *   PATCH  /health/alerts/:id                 → Acknowledge / resolve an alert
 *
 *   GET    /health/thresholds                 → List thresholds for facility
 *   PUT    /health/thresholds                 → Upsert a threshold (Admin)
 *
 * Every query is facility-scoped via the caller's JWT facilityId.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { HealthService } from './health.service';
import { RecordVitalsDto } from './dto/record-vitals.dto';
import { UpdateThresholdDto } from './dto/update-threshold.dto';
import { UpdateAlertDto } from './dto/update-alert.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Health')
@ApiBearerAuth()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  VITALS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Post('vitals')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Record vital signs for a resident',
    description:
      'Inserts a vital-sign row and automatically checks facility thresholds. ' +
      'Any out-of-range values create internal alert records.',
  })
  @ApiResponse({ status: 201, description: 'Vital sign + any triggered alerts.' })
  async recordVitals(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RecordVitalsDto,
  ) {
    return this.healthService.recordVitals(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get('vitals')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List vital-sign readings for the caller\'s facility' })
  @ApiQuery({ name: 'residentId', required: false, description: 'Filter by resident UUID' })
  @ApiResponse({ status: 200, description: 'Array of vital-sign readings.' })
  async findVitals(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
  ) {
    return this.healthService.findVitals(req.user.facilityId, {
      residentId,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ALERTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Get('alerts')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List vital alerts for the caller\'s facility' })
  @ApiQuery({ name: 'residentId', required: false, description: 'Filter by resident UUID' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'acknowledged', 'resolved'],
    description: 'Filter by alert status',
  })
  @ApiResponse({ status: 200, description: 'Array of vital alerts.' })
  async findAlerts(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('status') status?: string,
  ) {
    return this.healthService.findAlerts(req.user.facilityId, {
      residentId,
      status,
    });
  }

  @Patch('alerts/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Acknowledge or resolve a vital alert' })
  @ApiParam({ name: 'id', description: 'Alert UUID' })
  @ApiResponse({ status: 200, description: 'Updated alert.' })
  @ApiResponse({ status: 404, description: 'Alert not found.' })
  async updateAlert(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateAlertDto,
  ) {
    return this.healthService.updateAlert(
      req.user.facilityId,
      id,
      req.user.userId,
      dto,
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  THRESHOLDS (Admin editable)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Get('thresholds')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List vital thresholds for the caller\'s facility' })
  @ApiResponse({ status: 200, description: 'Array of threshold settings.' })
  async findThresholds(@Request() req: AuthenticatedRequest) {
    return this.healthService.findThresholds(req.user.facilityId);
  }

  @Put('thresholds')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  @ApiOperation({
    summary: 'Create or update a vital threshold (Admin only)',
    description:
      'Upserts a threshold row keyed by facility + vital_type. ' +
      'Set minValue/maxValue to null to remove that bound.',
  })
  @ApiResponse({ status: 200, description: 'Upserted threshold.' })
  @ApiResponse({ status: 403, description: 'Forbidden – Admin role required.' })
  async upsertThreshold(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateThresholdDto,
  ) {
    return this.healthService.upsertThreshold(req.user.facilityId, dto);
  }
}
