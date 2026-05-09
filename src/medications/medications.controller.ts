/**
 * US-04-01 – MedicationsController
 *
 * Exposes medication schedule CRUD, dose logging, and overdue query endpoints.
 *
 * Endpoints:
 *   POST   /medications/schedules              → Create a schedule
 *   GET    /medications/schedules              → List schedules (optional filters)
 *   GET    /medications/schedules/:id          → Get a single schedule
 *   PATCH  /medications/schedules/:id          → Update a schedule
 *
 *   POST   /medications/doses                  → Log a dose
 *   GET    /medications/doses                  → List dose logs (optional filters)
 *   PATCH  /medications/doses/:id              → Update a dose log
 *
 *   GET    /medications/overdue                → Get overdue (pending + past) doses
 *
 *   GET    /medications/adherence              → Adherence report (US-04-05)
 *
 * Every query is facility-scoped via the caller's JWT facilityId.
 */

import {
  Controller,
  Get,
  Post,
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
import { MedicationsService } from './medications.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { LogDoseDto } from './dto/log-dose.dto';
import { UpdateDoseDto } from './dto/update-dose.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Medications')
@ApiBearerAuth()
@Controller('medications')
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  SCHEDULE CRUD
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Post('schedules')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a medication schedule' })
  @ApiResponse({ status: 201, description: 'Schedule created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async createSchedule(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateScheduleDto,
  ) {
    return this.medicationsService.createSchedule(req.user.facilityId, dto);
  }

  @Get('schedules')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: "List medication schedules for the caller's facility",
  })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({
    name: 'active',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiResponse({ status: 200, description: 'Array of medication schedules.' })
  async findAllSchedules(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('active') active?: string,
  ) {
    return this.medicationsService.findAllSchedules(req.user.facilityId, {
      residentId,
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Get('schedules/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a single medication schedule by ID' })
  @ApiParam({ name: 'id', description: 'Schedule UUID' })
  @ApiResponse({ status: 200, description: 'Schedule object.' })
  @ApiResponse({ status: 404, description: 'Schedule not found.' })
  async findOneSchedule(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.medicationsService.findOneSchedule(req.user.facilityId, id);
  }

  @Patch('schedules/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Partially update a medication schedule' })
  @ApiParam({ name: 'id', description: 'Schedule UUID' })
  @ApiResponse({ status: 200, description: 'Updated schedule object.' })
  @ApiResponse({ status: 404, description: 'Schedule not found.' })
  async updateSchedule(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
  ) {
    return this.medicationsService.updateSchedule(req.user.facilityId, id, dto);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  DOSE LOGGING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Post('doses')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Log a dose (create a dose_log entry)' })
  @ApiResponse({ status: 201, description: 'Dose log created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async logDose(@Request() req: AuthenticatedRequest, @Body() dto: LogDoseDto) {
    return this.medicationsService.logDose(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get('doses')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "List dose logs for the caller's facility" })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({
    name: 'scheduleId',
    required: false,
    description: 'Filter by schedule UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'given', 'skipped', 'missed'],
    description: 'Filter by dose status',
  })
  @ApiResponse({ status: 200, description: 'Array of dose logs.' })
  async findDoseLogs(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('scheduleId') scheduleId?: string,
    @Query('status') status?: string,
  ) {
    return this.medicationsService.findDoseLogs(req.user.facilityId, {
      residentId,
      scheduleId,
      status,
    });
  }

  @Patch('doses/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update a dose log status' })
  @ApiParam({ name: 'id', description: 'Dose log UUID' })
  @ApiResponse({ status: 200, description: 'Updated dose log.' })
  @ApiResponse({ status: 404, description: 'Dose log not found.' })
  async updateDose(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDoseDto,
  ) {
    return this.medicationsService.updateDose(
      req.user.facilityId,
      id,
      req.user.userId,
      dto,
    );
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  OVERDUE QUERY
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Get('overdue')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get overdue doses (pending + past scheduled_time)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of overdue dose objects with medication context.',
  })
  async findOverdue(@Request() req: AuthenticatedRequest) {
    return this.medicationsService.findOverdue(req.user.facilityId);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  ADHERENCE REPORTING  (US-04-05)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Get('adherence')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Medication adherence report (weekly / monthly)',
    description:
      'Returns adherence percentages per resident and facility-wide. ' +
      'Adherence = given doses / total doses × 100.',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['weekly', 'monthly'],
    description: 'Reporting period (default: weekly = last 7 days)',
  })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Optional – filter to a single resident',
  })
  @ApiResponse({ status: 200, description: 'Adherence report object.' })
  async getAdherenceReport(
    @Request() req: AuthenticatedRequest,
    @Query('period') period?: string,
    @Query('residentId') residentId?: string,
  ) {
    const validPeriod = period === 'monthly' ? 'monthly' : 'weekly';
    return this.medicationsService.getAdherenceReport(
      req.user.facilityId,
      validPeriod,
      residentId,
    );
  }
}
