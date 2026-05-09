/**
 * US-03-02 – ResidentsController
 *
 * Exposes resident CRUD endpoints with facility scoping.
 *
 * Endpoints:
 *   POST   /residents          → Create resident (Admin only)
 *   GET    /residents          → List residents for the caller's facility
 *   GET    /residents/:id      → Get a single resident
 *   PATCH  /residents/:id      → Partially update a resident (Admin only)
 *
 * Cross-facility access is blocked because every operation uses the
 * facilityId from the authenticated user's JWT – never from the URL or body.
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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Residents')
@ApiBearerAuth()
@Controller('residents')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  // ── POST /residents ────────────────────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  @ApiOperation({ summary: 'Create a new resident (Admin only)' })
  @ApiResponse({ status: 201, description: 'Resident created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden – Admin role required.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateResidentDto,
  ) {
    return this.residentsService.create(req.user.facilityId, dto);
  }

  // ── GET /residents ─────────────────────────────────────────────────────────

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List all residents for the caller\'s facility' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'discharged', 'deceased'],
    description: 'Filter by resident status',
  })
  @ApiResponse({ status: 200, description: 'Array of residents.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    return this.residentsService.findAll(req.user.facilityId, { status });
  }

  // ── GET /residents/:id ─────────────────────────────────────────────────────

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a single resident by ID' })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiResponse({ status: 200, description: 'Resident object.' })
  @ApiResponse({ status: 404, description: 'Resident not found.' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.residentsService.findOne(req.user.facilityId, id);
  }

  // ── PATCH /residents/:id ───────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  @ApiOperation({ summary: 'Partially update a resident (Admin only)' })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiResponse({ status: 200, description: 'Updated resident object.' })
  @ApiResponse({ status: 404, description: 'Resident not found.' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateResidentDto,
  ) {
    return this.residentsService.update(req.user.facilityId, id, dto);
  }
}
