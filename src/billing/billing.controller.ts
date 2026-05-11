/**
 * US-15-03 – BillingController
 *
 * Endpoints:
 *   POST   /billing           → Create a bill
 *   GET    /billing           → List bills (filterable by residentId, isPaid)
 *   PATCH  /billing/:id/pay   → Mark bill as paid
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
import { BillingService } from './billing.service';
import { CreateBillDto } from './dto/create-bill.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a family bill' })
  @ApiResponse({ status: 201, description: 'Bill created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateBillDto,
  ) {
    return this.billingService.create(req.user.facilityId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List family bills' })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({
    name: 'isPaid',
    required: false,
    description: 'Filter by paid status (true/false)',
  })
  @ApiResponse({ status: 200, description: 'Array of family bills.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('isPaid') isPaid?: string,
  ) {
    return this.billingService.findAll(req.user.facilityId, {
      residentId,
      isPaid: isPaid !== undefined ? isPaid === 'true' : undefined,
    });
  }

  @Patch(':id/pay')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Mark a bill as paid' })
  @ApiParam({ name: 'id', description: 'Bill UUID' })
  @ApiResponse({ status: 200, description: 'Bill marked as paid.' })
  @ApiResponse({ status: 404, description: 'Bill not found.' })
  async markPaid(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.billingService.markPaid(req.user.facilityId, id);
  }
}
