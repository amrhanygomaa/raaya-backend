/**
 * US-07-01 – KpiController
 *
 * Exposes KPI aggregate endpoints for the admin dashboard.
 *
 * Endpoints:
 *   GET    /kpi/dashboard          → Full KPI dashboard (all metrics)
 *
 * Every query is facility-scoped via the caller's JWT facilityId.
 */

import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { KpiService } from './kpi.service';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('KPI')
@ApiBearerAuth()
@Controller('kpi')
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('dashboard')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'KPI dashboard – aggregate metrics for admin reporting',
    description:
      'Returns medication adherence, family engagement, critical-alert count, ' +
      "and complaint-closure metrics for the caller's facility.",
  })
  @ApiQuery({
    name: 'days',
    required: false,
    type: Number,
    description: 'Look-back window in days (default: 30)',
  })
  @ApiResponse({ status: 200, description: 'KPI dashboard object.' })
  async getDashboard(
    @Request() req: AuthenticatedRequest,
    @Query('days') days?: string,
  ) {
    const parsedDays =
      days && !isNaN(Number(days))
        ? Math.max(1, Math.min(365, Number(days)))
        : 30;
    return this.kpiService.getDashboard(req.user.facilityId, parsedDays);
  }
}
