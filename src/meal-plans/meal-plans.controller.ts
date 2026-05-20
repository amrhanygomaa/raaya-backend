/**
 * US-13-07 – MealPlansController
 *
 * Endpoints:
 *   POST   /meal-plans       → Create a meal plan
 *   GET    /meal-plans       → List plans (filterable by residentId, date)
 *   PATCH  /meal-plans/:id   → Update a meal plan
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
import { MealPlansService } from './meal-plans.service';
import { CreateMealPlanDto } from './dto/create-meal-plan.dto';
import { UpdateMealPlanDto } from './dto/update-meal-plan.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Meal Plans')
@ApiBearerAuth()
@Controller('meal-plans')
export class MealPlansController {
  constructor(private readonly mealPlansService: MealPlansService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a meal plan' })
  @ApiResponse({ status: 201, description: 'Meal plan created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateMealPlanDto,
  ) {
    return this.mealPlansService.create(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List meal plans' })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by plan date (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Array of meal plans.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('date') date?: string,
  ) {
    return this.mealPlansService.findAll(req.user.facilityId, {
      residentId,
      date,
    });
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update a meal plan' })
  @ApiParam({ name: 'id', description: 'Meal plan UUID' })
  @ApiResponse({ status: 200, description: 'Updated meal plan.' })
  @ApiResponse({ status: 404, description: 'Meal plan not found.' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateMealPlanDto,
  ) {
    return this.mealPlansService.update(req.user.facilityId, id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete a meal plan' })
  @ApiParam({ name: 'id', description: 'Meal plan UUID' })
  @ApiResponse({ status: 200, description: 'Meal plan deleted.' })
  @ApiResponse({ status: 404, description: 'Meal plan not found.' })
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.mealPlansService.delete(req.user.facilityId, id);
  }
}
