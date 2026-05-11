/**
 * US-13-03 – MedicalSessionsController
 *
 * Endpoints:
 *   POST   /medical-sessions   → Log a medical session
 *   GET    /medical-sessions   → List sessions (filterable by residentId, type)
 */

import {
  Controller,
  Get,
  Post,
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
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MedicalSessionsService } from './medical-sessions.service';
import { CreateMedicalSessionDto } from './dto/create-medical-session.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Medical Sessions')
@ApiBearerAuth()
@Controller('medical-sessions')
export class MedicalSessionsController {
  constructor(
    private readonly medicalSessionsService: MedicalSessionsService,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Log a medical session' })
  @ApiResponse({ status: 201, description: 'Medical session created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateMedicalSessionDto,
  ) {
    return this.medicalSessionsService.create(req.user.facilityId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List medical sessions' })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['doctor', 'pt', 'vitals'] })
  @ApiResponse({ status: 200, description: 'Array of medical sessions.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('type') type?: string,
  ) {
    return this.medicalSessionsService.findAll(req.user.facilityId, {
      residentId,
      type,
    });
  }
}
