/**
 * US-14-01 – ActivitiesController
 *
 * Endpoints:
 *   POST   /activities        → Create an activity
 *   GET    /activities        → List activities (filterable by date, upcoming)
 *   PATCH  /activities/:id    → Update an activity
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Activities')
@ApiBearerAuth()
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create an activity session' })
  @ApiResponse({ status: 201, description: 'Activity created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activitiesService.create(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List activity sessions' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'upcoming',
    required: false,
    description: 'Only upcoming (true/false)',
  })
  @ApiResponse({ status: 200, description: 'Array of activity sessions.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('date') date?: string,
    @Query('upcoming') upcoming?: string,
  ) {
    return this.activitiesService.findAll(req.user.facilityId, {
      date,
      upcoming: upcoming === 'true',
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update an activity session' })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiResponse({ status: 200, description: 'Updated activity.' })
  @ApiResponse({ status: 404, description: 'Activity not found.' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activitiesService.update(req.user.facilityId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete an activity session' })
  @ApiParam({ name: 'id', description: 'Activity UUID' })
  @ApiResponse({ status: 200, description: 'Activity deleted.' })
  @ApiResponse({ status: 404, description: 'Activity not found.' })
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.activitiesService.delete(req.user.facilityId, id);
  }
}
