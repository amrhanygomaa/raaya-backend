/**
 * US-03-02 – ResidentsController
 *
 * Exposes resident CRUD endpoints with facility scoping.
 *
 * Endpoints:
 *   POST   /residents          → Create resident (Admin only)
 *   GET    /residents          → List residents for the caller's facility
 *   GET    /residents/:id      → Get a single resident
 *   PATCH  /residents/:id      → Partially update a resident (Admin only)
 *
 * Cross-facility access is blocked because every operation uses the
 * facilityId from the authenticated user's JWT – never from the URL or body.
 */

import {
  Controller,
  Get,
  Inject,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ResidentsService } from './residents.service';
import { CreateResidentDto } from './dto/create-resident.dto';
import { UpdateResidentDto } from './dto/update-resident.dto';
import { UpsertMedicalInfoDto } from './dto/upsert-medical-info.dto';
import { RealtimeGateway } from '../gateway/realtime.gateway';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Residents')
@ApiBearerAuth()
@Controller('residents')
export class ResidentsController {
  constructor(
    private readonly residentsService: ResidentsService,
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly gateway: RealtimeGateway,
  ) {}

  // ── POST /residents ────────────────────────────────────────────────────────

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  @ApiOperation({ summary: 'Create a new resident (Admin only)' })
  @ApiResponse({ status: 201, description: 'Resident created.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden – Admin role required.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateResidentDto,
  ) {
    const resident = await this.residentsService.create(
      req.user.facilityId,
      dto,
      {
        userId: req.user.userId,
        name: req.user.email,
        roles: req.user.roles,
      },
    );
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'residents',
      action: 'resident_created',
      entityId: resident.id,
      residentId: resident.id,
      userId: req.user.userId,
      data: resident as unknown as Record<string, unknown>,
    });
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'resident_audit',
      action: 'created',
      entityId: resident.id,
      residentId: resident.id,
      userId: req.user.userId,
    });
    return resident;
  }

  // ── GET /residents ─────────────────────────────────────────────────────────

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "List all residents for the caller's facility" })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'discharged', 'deceased'],
    description: 'Filter by resident status',
  })
  @ApiResponse({ status: 200, description: 'Array of residents.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
  ) {
    return this.residentsService.findAll(req.user.facilityId, { status });
  }

  // ── GET /residents/:id ─────────────────────────────────────────────────────

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get a single resident by ID' })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiResponse({ status: 200, description: 'Resident object.' })
  @ApiResponse({ status: 404, description: 'Resident not found.' })
  async findOne(@Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.residentsService.findOne(req.user.facilityId, id);
  }

  // ── PATCH /residents/:id ───────────────────────────────────────────────────

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  @ApiOperation({ summary: 'Partially update a resident (Admin only)' })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiResponse({ status: 200, description: 'Updated resident object.' })
  @ApiResponse({ status: 404, description: 'Resident not found.' })
  async update(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateResidentDto,
  ) {
    const resident = await this.residentsService.update(
      req.user.facilityId,
      id,
      dto,
      {
        userId: req.user.userId,
        name: req.user.email,
        roles: req.user.roles,
      },
    );
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'residents',
      action: 'resident_updated',
      entityId: id,
      residentId: id,
      userId: req.user.userId,
      data: resident as unknown as Record<string, unknown>,
    });
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'resident_audit',
      action: 'updated',
      entityId: id,
      residentId: id,
      userId: req.user.userId,
    });
    return resident;
  }

  // ── GET /residents/:id/medical-info ─────────────────────────────────────────

  @Get(':id/medical-info')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get medical info for a resident' })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiResponse({ status: 200, description: 'Resident medical info.' })
  @ApiResponse({ status: 404, description: 'Resident not found.' })
  async getMedicalInfo(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.residentsService.getMedicalInfo(req.user.facilityId, id);
  }

  // ── PUT /residents/:id/medical-info ─────────────────────────────────────────

  @Put(':id/medical-info')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Upsert medical info for a resident' })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiResponse({ status: 200, description: 'Updated medical info.' })
  @ApiResponse({ status: 404, description: 'Resident not found.' })
  async upsertMedicalInfo(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpsertMedicalInfoDto,
  ) {
    const medicalInfo = await this.residentsService.upsertMedicalInfo(
      req.user.facilityId,
      id,
      dto,
      {
        userId: req.user.userId,
        name: req.user.email,
        roles: req.user.roles,
      },
    );
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'residents',
      action: 'resident_medical_info_updated',
      entityId: id,
      residentId: id,
      userId: req.user.userId,
      data: medicalInfo as unknown as Record<string, unknown>,
    });
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'resident_audit',
      action: 'medical_info_updated',
      entityId: id,
      residentId: id,
      userId: req.user.userId,
    });
    return medicalInfo;
  }

  // ── POST /residents/:id/documents/upload ──────────────────────────────────

  @Post(':id/documents/upload')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  @ApiOperation({ summary: 'Request a presigned S3 URL to upload a resident document' })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiResponse({ status: 201, description: 'Presigned URL + document record id.' })
  async requestDocumentUpload(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { fileName: string; contentType: string },
  ) {
    return this.residentsService.requestDocumentUpload(
      req.user.facilityId,
      req.user.userId,
      id,
      body.fileName ?? 'document',
      body.contentType ?? 'application/octet-stream',
    );
  }

  // ── PATCH /residents/:id/documents/:docId/confirm ──────────────────────────

  @Patch(':id/documents/:docId/confirm')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('Admin')
  @ApiOperation({ summary: 'Confirm a resident document upload is complete' })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiParam({ name: 'docId', description: 'Document linked_record UUID' })
  @ApiResponse({ status: 200, description: 'Confirmed document record.' })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  async confirmDocumentUpload(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('docId') docId: string,
  ) {
    return this.residentsService.confirmDocumentUpload(
      req.user.facilityId,
      id,
      docId,
    );
  }

  // ── GET /residents/:id/documents ───────────────────────────────────────────

  @Get(':id/documents')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List confirmed documents for a resident' })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiResponse({ status: 200, description: 'Array of resident documents.' })
  async getDocuments(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.residentsService.getDocuments(req.user.facilityId, id);
  }

  // ── GET /residents/:id/audit-trail ──────────────────────────────────────────

  @Get(':id/audit-trail')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'List recent audit log entries for a resident',
    description:
      'Returns up to 200 most recent rows from resident_audit_log for the given resident. ' +
      'Verifies the resident belongs to the caller facility first.',
  })
  @ApiParam({ name: 'id', description: 'Resident UUID' })
  @ApiResponse({ status: 200, description: 'Array of audit entries.' })
  async getAuditTrail(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const check = await this.pool.query<Record<string, unknown>>(
      `SELECT id FROM residents WHERE id = $1 AND facility_id = $2`,
      [id, req.user.facilityId],
    );
    if (check.rows.length === 0) return [];

    const result = await this.pool.query<Record<string, unknown>>(
      `SELECT id, action, actor_name, actor_role, changed_fields, at
       FROM resident_audit_log
       WHERE resident_id = $1 AND facility_id = $2
       ORDER BY at DESC
       LIMIT 200`,
      [id, req.user.facilityId],
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      action: row.action as string,
      actorName: row.actor_name as string,
      actorRole: row.actor_role as string,
      changedFields: row.changed_fields ?? {},
      at: (row.at as Date)?.toISOString?.() ?? (row.at as string),
    }));
  }
}
