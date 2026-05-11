/**
 * US-13-01 – DoctorVisitsController
 *
 * Endpoints:
 *   POST   /doctor-visits                → Schedule a visit
 *   GET    /doctor-visits                → List visits (filterable)
 *   PATCH  /doctor-visits/:id            → Update visit results
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
import { DoctorVisitsService } from './doctor-visits.service';
import { CreateDoctorVisitDto } from './dto/create-doctor-visit.dto';
import { UpdateDoctorVisitDto } from './dto/update-doctor-visit.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Doctor Visits')
@ApiBearerAuth()
@Controller('doctor-visits')
export class DoctorVisitsController {
  constructor(private readonly doctorVisitsService: DoctorVisitsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Schedule a doctor visit' })
  @ApiResponse({ status: 201, description: 'Doctor visit created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateDoctorVisitDto,
  ) {
    return this.doctorVisitsService.create(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List doctor visits' })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({
    name: 'upcoming',
    required: false,
    description: 'Only show upcoming visits (true/false)',
  })
  @ApiResponse({ status: 200, description: 'Array of doctor visits.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.doctorVisitsService.findAll(req.user.facilityId, {
      residentId,
      upcoming: upcoming === 'true',
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update a doctor visit' })
  @ApiParam({ name: 'id', description: 'Doctor visit UUID' })
  @ApiResponse({ status: 200, description: 'Updated doctor visit.' })
  @ApiResponse({ status: 404, description: 'Visit not found.' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateDoctorVisitDto,
  ) {
    return this.doctorVisitsService.update(req.user.facilityId, id, dto);
  }
}
