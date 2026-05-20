/**
 * US-14-06 – MemoriesController
 *
 * Endpoints:
 *   POST   /memories               → Create moment (returns presigned S3 upload URL)
 *   GET    /memories               → List moments (filterable by residentId)
 *   PATCH  /memories/:id/appreciate → Increment appreciation count
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
import { MemoriesService } from './memories.service';
import { CreateMemoryDto } from './dto/create-memory.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Memories')
@ApiBearerAuth()
@Controller('memories')
export class MemoriesController {
  constructor(private readonly memoriesService: MemoriesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Create a memory moment (returns presigned S3 upload URL)',
  })
  @ApiResponse({
    status: 201,
    description: 'Memory moment created with upload URL.',
  })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateMemoryDto,
  ) {
    return this.memoriesService.create(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List memory moments' })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiResponse({ status: 200, description: 'Array of memory moments.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
  ) {
    return this.memoriesService.findAll(req.user.facilityId, { residentId });
  }

  @Patch(':id/appreciate')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Appreciate a memory moment' })
  @ApiParam({ name: 'id', description: 'Memory moment UUID' })
  @ApiResponse({
    status: 200,
    description: 'Updated moment with incremented count.',
  })
  @ApiResponse({ status: 404, description: 'Moment not found.' })
  async appreciate(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.memoriesService.appreciate(req.user.facilityId, id);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete a memory moment' })
  @ApiParam({ name: 'id', description: 'Memory moment UUID' })
  @ApiResponse({ status: 200, description: 'Memory moment deleted.' })
  @ApiResponse({ status: 404, description: 'Moment not found.' })
  async delete(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.memoriesService.delete(req.user.facilityId, id);
  }
}
