/**
 * US-12-01 – NursingNotesController
 *
 * Endpoints:
 *   POST   /nursing-notes          → Create a nursing note
 *   GET    /nursing-notes          → List notes (filterable by residentId, authorId)
 *   GET    /nursing-notes/:id      → Get single note
 *   PATCH  /nursing-notes/:id      → Update note content
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
import { NursingNotesService } from './nursing-notes.service';
import { CreateNursingNoteDto } from './dto/create-nursing-note.dto';
import { UpdateNursingNoteDto } from './dto/update-nursing-note.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Nursing Notes')
@ApiBearerAuth()
@Controller('nursing-notes')
export class NursingNotesController {
  constructor(private readonly nursingNotesService: NursingNotesService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a nursing note' })
  @ApiResponse({ status: 201, description: 'Nursing note created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateNursingNoteDto,
  ) {
    return this.nursingNotesService.create(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List nursing notes for the facility' })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({
    name: 'authorId',
    required: false,
    description: 'Filter by author ID',
  })
  @ApiResponse({ status: 200, description: 'Array of nursing notes.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('authorId') authorId?: string,
  ) {
    return this.nursingNotesService.findAll(req.user.facilityId, {
      residentId,
      authorId,
    });
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a single nursing note by ID' })
  @ApiParam({ name: 'id', description: 'Nursing note UUID' })
  @ApiResponse({ status: 200, description: 'Nursing note object.' })
  @ApiResponse({ status: 404, description: 'Nursing note not found.' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.nursingNotesService.findOne(req.user.facilityId, id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update a nursing note' })
  @ApiParam({ name: 'id', description: 'Nursing note UUID' })
  @ApiResponse({ status: 200, description: 'Updated nursing note.' })
  @ApiResponse({ status: 404, description: 'Nursing note not found.' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateNursingNoteDto,
  ) {
    return this.nursingNotesService.update(req.user.facilityId, id, dto);
  }
}
