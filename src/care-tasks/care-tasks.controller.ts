/**
 * US-12-05 – CareTasksController
 *
 * Endpoints:
 *   POST   /care-tasks               → Create a care task
 *   GET    /care-tasks               → List tasks (filterable)
 *   PATCH  /care-tasks/:id/complete  → Mark task complete
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
import { CareTasksService } from './care-tasks.service';
import { CreateCareTaskDto } from './dto/create-care-task.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Care Tasks')
@ApiBearerAuth()
@Controller('care-tasks')
export class CareTasksController {
  constructor(private readonly careTasksService: CareTasksService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a care task' })
  @ApiResponse({ status: 201, description: 'Care task created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateCareTaskDto,
  ) {
    return this.careTasksService.create(req.user.facilityId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List care tasks for the facility' })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: ['personal', 'recreational', 'hotel'],
  })
  @ApiResponse({ status: 200, description: 'Array of care tasks.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('date') date?: string,
    @Query('category') category?: string,
  ) {
    return this.careTasksService.findAll(req.user.facilityId, {
      residentId,
      date,
      category,
    });
  }

  @Patch(':id/complete')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Mark a care task as complete' })
  @ApiParam({ name: 'id', description: 'Care task UUID' })
  @ApiResponse({ status: 200, description: 'Task marked complete with audit.' })
  @ApiResponse({ status: 404, description: 'Care task not found.' })
  async complete(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.careTasksService.complete(
      req.user.facilityId,
      id,
      req.user.userId,
    );
  }
}
