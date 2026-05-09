/**
 * US-07-03 – ComplaintsController
 *
 * Exposes complaint CRUD endpoints with status transition validation.
 *
 * Endpoints:
 *   POST   /complaints              → Create a complaint
 *   GET    /complaints              → List complaints (filterable)
 *   GET    /complaints/:id          → Get single complaint
 *   PATCH  /complaints/:id/status   → Update status (validated transitions + audit)
 *
 * Status transitions:
 *   open → in_progress | closed
 *   in_progress → resolved | closed
 *   resolved → closed
 *   closed → (terminal)
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
import { ComplaintsService } from './complaints.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Complaints')
@ApiBearerAuth()
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Create a complaint',
    description: 'Creates a new complaint with status "open".',
  })
  @ApiResponse({ status: 201, description: 'Complaint created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateComplaintDto,
  ) {
    return this.complaintsService.create(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List complaints for the caller\'s facility' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['open', 'in_progress', 'resolved', 'closed'],
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['low', 'medium', 'high', 'critical'],
  })
  @ApiQuery({ name: 'residentId', required: false, description: 'Filter by resident UUID' })
  @ApiResponse({ status: 200, description: 'Array of complaints.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('residentId') residentId?: string,
  ) {
    return this.complaintsService.findAll(req.user.facilityId, {
      status,
      priority,
      residentId,
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a single complaint by ID' })
  @ApiParam({ name: 'id', description: 'Complaint UUID' })
  @ApiResponse({ status: 200, description: 'Complaint object.' })
  @ApiResponse({ status: 404, description: 'Complaint not found.' })
  async findOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.complaintsService.findOne(req.user.facilityId, id);
  }

  @Patch(':id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Update complaint status',
    description:
      'Transitions must follow the valid state machine: ' +
      'open→in_progress|closed, in_progress→resolved|closed, resolved→closed. ' +
      'Audit fields (resolved_by, resolved_at) are set automatically on resolution.',
  })
  @ApiParam({ name: 'id', description: 'Complaint UUID' })
  @ApiResponse({ status: 200, description: 'Updated complaint with audit fields.' })
  @ApiResponse({ status: 400, description: 'Invalid status transition.' })
  @ApiResponse({ status: 404, description: 'Complaint not found.' })
  async updateStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateComplaintStatusDto,
  ) {
    return this.complaintsService.updateStatus(
      req.user.facilityId,
      id,
      req.user.userId,
      dto,
    );
  }
}
