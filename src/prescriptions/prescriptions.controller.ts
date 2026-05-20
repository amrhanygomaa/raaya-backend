/**
 * US-13-05 – PrescriptionsController
 *
 * Endpoints:
 *   POST   /prescriptions           → Create a prescription
 *   GET    /prescriptions           → List prescriptions (filterable by residentId)
 */

import {
  Controller,
  Get,
  Post,
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
import { PrescriptionsService } from './prescriptions.service';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Prescriptions')
@ApiBearerAuth()
@Controller('prescriptions')
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a prescription' })
  @ApiResponse({ status: 201, description: 'Prescription created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(req.user.facilityId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List prescriptions' })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiResponse({ status: 200, description: 'Array of prescriptions.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
  ) {
    return this.prescriptionsService.findAll(req.user.facilityId, {
      residentId,
    });
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete a prescription' })
  @ApiParam({ name: 'id', description: 'Prescription UUID' })
  @ApiResponse({ status: 200, description: 'Prescription deleted.' })
  @ApiResponse({ status: 404, description: 'Prescription not found.' })
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.prescriptionsService.delete(req.user.facilityId, id);
  }
}
