/**
 * US-05-01 – FamilyBridgeController
 *
 * Exposes Family Bridge media and visit endpoints.
 *
 * Endpoints:
 *   POST   /family-bridge/media/upload         → Get presigned S3 upload URL
 *   PATCH  /family-bridge/media/:id/confirm    → Confirm upload complete
 *   GET    /family-bridge/media                → List media items
 *
 *   POST   /family-bridge/visits               → Book a visit
 *   GET    /family-bridge/visits               → List visits
 *   PATCH  /family-bridge/visits/:id/status    → Update visit status (approve/reject/etc.)
 *
 * Family accounts can only access linked residents.
 * Staff roles bypass that restriction.
 */

import {
  Controller,
  Delete,
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
import { FamilyBridgeService } from './family-bridge.service';
import { UploadMediaDto } from './dto/upload-media.dto';
import { ConfirmMediaDto } from './dto/confirm-media.dto';
import { BookVisitDto } from './dto/book-visit.dto';
import { UpdateVisitStatusDto } from './dto/update-visit-status.dto';
import { RealtimeGateway } from '../gateway/realtime.gateway';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Family Bridge')
@ApiBearerAuth()
@Controller('family-bridge')
export class FamilyBridgeController {
  constructor(
    private readonly familyBridgeService: FamilyBridgeService,
    private readonly gateway: RealtimeGateway,
  ) {}

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  MEDIA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Post('media/upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Request a presigned S3 upload URL',
    description:
      'Creates a pending media record and returns a presigned PUT URL (15-min expiry). ' +
      'The client uploads the file directly to S3, then calls confirm.',
  })
  @ApiResponse({ status: 201, description: 'Presigned URL + media record.' })
  @ApiResponse({
    status: 403,
    description: 'Family account not linked to resident.',
  })
  async requestUpload(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UploadMediaDto,
  ) {
    await this.familyBridgeService.assertFamilyAccess(
      req.user.roles,
      req.user.email,
      dto.residentId,
    );
    return this.familyBridgeService.requestUpload(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Patch('media/:id/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Confirm a media upload is complete' })
  @ApiParam({ name: 'id', description: 'Media item UUID' })
  @ApiResponse({ status: 200, description: 'Confirmed media item.' })
  @ApiResponse({
    status: 404,
    description: 'Media not found or already confirmed.',
  })
  async confirmUpload(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ConfirmMediaDto,
  ) {
    const media = await this.familyBridgeService.confirmUpload(
      req.user.facilityId,
      id,
      dto,
    );
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'family_media',
      action: 'media_confirmed',
      entityId: media.id,
      residentId: media.residentId,
      data: media as unknown as Record<string, unknown>,
    });
    this.gateway.broadcastKpiRefresh(
      req.user.facilityId,
      'family_media_changed',
    );
    return media;
  }

  @Delete('media/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary:
      'Delete a media item by ID (admin/uploader scoped to the facility)',
  })
  @ApiParam({ name: 'id', description: 'Media item UUID' })
  @ApiResponse({ status: 200, description: 'Media deleted.' })
  @ApiResponse({ status: 404, description: 'Media not found.' })
  async deleteMedia(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    const result = await this.familyBridgeService.deleteMedia(
      req.user.facilityId,
      id,
    );
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'family_media',
      action: 'media_deleted',
      entityId: id,
    });
    this.gateway.broadcastKpiRefresh(
      req.user.facilityId,
      'family_media_changed',
    );
    return result;
  }

  @Get('media')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "List media items for the caller's facility" })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending_upload', 'confirmed', 'rejected'],
    description: 'Filter by media status',
  })
  @ApiResponse({ status: 200, description: 'Array of media items.' })
  async findMedia(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('status') status?: string,
  ) {
    if (residentId) {
      await this.familyBridgeService.assertFamilyAccess(
        req.user.roles,
        req.user.email,
        residentId,
      );
    }
    return this.familyBridgeService.findMedia(req.user.facilityId, {
      residentId,
      status,
    });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  VISITS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  @Post('visits')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Book a visit for a resident' })
  @ApiResponse({ status: 201, description: 'Visit booked.' })
  @ApiResponse({
    status: 403,
    description: 'Family account not linked to resident.',
  })
  async bookVisit(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BookVisitDto,
  ) {
    await this.familyBridgeService.assertFamilyAccess(
      req.user.roles,
      req.user.email,
      dto.residentId,
    );
    const visit = await this.familyBridgeService.bookVisit(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'family_visits',
      action: 'visit_booked',
      entityId: visit.id,
      residentId: visit.residentId,
      userId: req.user.userId,
      data: visit as unknown as Record<string, unknown>,
    });
    this.gateway.broadcastKpiRefresh(
      req.user.facilityId,
      'family_visits_changed',
    );
    return visit;
  }

  @Get('visits')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: "List visits for the caller's facility" })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
    description: 'Filter by visit status',
  })
  @ApiResponse({ status: 200, description: 'Array of visits.' })
  async findVisits(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
    @Query('status') status?: string,
  ) {
    if (residentId) {
      await this.familyBridgeService.assertFamilyAccess(
        req.user.roles,
        req.user.email,
        residentId,
      );
    }
    return this.familyBridgeService.findVisits(req.user.facilityId, {
      residentId,
      status,
    });
  }

  @Patch('visits/:id/status')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Update visit status (approve / reject / complete / cancel)',
  })
  @ApiParam({ name: 'id', description: 'Visit UUID' })
  @ApiResponse({ status: 200, description: 'Updated visit.' })
  @ApiResponse({ status: 404, description: 'Visit not found.' })
  async updateVisitStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateVisitStatusDto,
  ) {
    const visit = await this.familyBridgeService.updateVisitStatus(
      req.user.facilityId,
      id,
      req.user.userId,
      dto,
    );
    this.gateway.broadcastLiveEvent(req.user.facilityId, {
      type: 'family_visits',
      action: 'visit_status_updated',
      entityId: visit.id,
      residentId: visit.residentId,
      userId: req.user.userId,
      data: visit as unknown as Record<string, unknown>,
    });
    this.gateway.broadcastKpiRefresh(
      req.user.facilityId,
      'family_visits_changed',
    );
    return visit;
  }
}
