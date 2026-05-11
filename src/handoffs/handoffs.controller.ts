/**
 * US-12-03 – HandoffsController
 *
 * Endpoints:
 *   POST   /handoffs          → Create a shift handoff
 *   GET    /handoffs          → List handoffs (filterable by date, nurseId)
 *   GET    /handoffs/:id      → Get single handoff
 */

import {
  Controller,
  Get,
  Post,
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
import { HandoffsService } from './handoffs.service';
import { CreateHandoffDto } from './dto/create-handoff.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Shift Handoffs')
@ApiBearerAuth()
@Controller('handoffs')
export class HandoffsController {
  constructor(private readonly handoffsService: HandoffsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a shift handoff' })
  @ApiResponse({ status: 201, description: 'Shift handoff created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateHandoffDto,
  ) {
    return this.handoffsService.create(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List shift handoffs for the facility' })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by shift date (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'nurseId',
    required: false,
    description: 'Filter by nurse ID (outgoing or incoming)',
  })
  @ApiResponse({ status: 200, description: 'Array of shift handoffs.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('date') date?: string,
    @Query('nurseId') nurseId?: string,
  ) {
    return this.handoffsService.findAll(req.user.facilityId, {
      date,
      nurseId,
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a single shift handoff by ID' })
  @ApiParam({ name: 'id', description: 'Handoff UUID' })
  @ApiResponse({ status: 200, description: 'Shift handoff object.' })
  @ApiResponse({ status: 404, description: 'Handoff not found.' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.handoffsService.findOne(req.user.facilityId, id);
  }
}
