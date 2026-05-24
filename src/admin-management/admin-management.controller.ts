import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminManagementService } from './admin-management.service';
import { CreateManagedUserDto } from './dto/create-managed-user.dto';
import { UpdateManagedUserDto } from './dto/update-managed-user.dto';
import { UpdateFacilitySettingsDto } from './dto/update-facility-settings.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Admin Management')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Admin')
export class AdminManagementController {
  constructor(
    private readonly adminManagementService: AdminManagementService,
  ) {}

  @Post('users')
  @ApiOperation({
    summary: 'Create a managed user',
    description:
      'Admin-only. Creates the user in Cognito and upserts the local managed_users record.',
  })
  @ApiResponse({ status: 201, description: 'Managed user created.' })
  @ApiResponse({ status: 403, description: 'Admin role required.' })
  async createUser(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateManagedUserDto,
  ) {
    return this.adminManagementService.createUser(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get('users')
  @ApiOperation({ summary: 'List managed users for the caller facility' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'disabled'],
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['Admin', 'Doctor', 'Nurse', 'ClinicalStaff', 'Family'],
  })
  @ApiResponse({ status: 200, description: 'Array of managed users.' })
  async findUsers(
    @Request() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.adminManagementService.findUsers(req.user.facilityId, {
      status,
      role,
    });
  }

  @Patch('users/:id')
  @ApiOperation({
    summary: 'Update a managed user',
    description:
      'Admin-only. Updates local managed_users fields and Cognito display attributes.',
  })
  @ApiParam({ name: 'id', description: 'managed_users UUID' })
  @ApiResponse({ status: 200, description: 'Managed user updated.' })
  @ApiResponse({ status: 404, description: 'Managed user not found.' })
  async updateUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateManagedUserDto,
  ) {
    return this.adminManagementService.updateUser(req.user.facilityId, id, dto);
  }

  @Patch('users/:id/disable')
  @ApiOperation({
    summary: 'Disable a managed user',
    description:
      'Admin-only. Disables the Cognito user and updates the local managed_users audit fields.',
  })
  @ApiParam({ name: 'id', description: 'managed_users UUID' })
  @ApiResponse({ status: 200, description: 'Managed user disabled.' })
  @ApiResponse({ status: 404, description: 'Managed user not found.' })
  async disableUser(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.adminManagementService.disableUser(
      req.user.facilityId,
      id,
      req.user.userId,
    );
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get facility settings for the caller facility' })
  @ApiResponse({ status: 200, description: 'Facility settings object.' })
  async getSettings(@Request() req: AuthenticatedRequest) {
    return this.adminManagementService.getSettings(req.user.facilityId);
  }

  @Put('settings')
  @ApiOperation({
    summary: 'Update facility settings',
    description:
      'Admin-only. Persists reminder defaults and vital thresholds. Vital thresholds are also synced to vital_thresholds.',
  })
  @ApiResponse({ status: 200, description: 'Updated facility settings.' })
  async updateSettings(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateFacilitySettingsDto,
  ) {
    return this.adminManagementService.updateSettings(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get a managed user details' })
  @ApiParam({ name: 'id', description: 'managed_users UUID' })
  @ApiResponse({ status: 200, description: 'Managed user details.' })
  @ApiResponse({ status: 404, description: 'Managed user not found.' })
  async getUserById(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.adminManagementService.getUserById(req.user.facilityId, id);
  }

  @Post('users/:id/photo/upload')
  @ApiOperation({
    summary: 'Request a presigned S3 URL for a staff profile photo',
  })
  @ApiParam({ name: 'id', description: 'managed_users UUID' })
  @ApiResponse({ status: 201, description: 'Presigned URL + s3Key.' })
  async requestStaffPhoto(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { fileName?: string; contentType?: string },
  ) {
    return this.adminManagementService.requestStaffPhotoUpload(
      req.user.facilityId,
      id,
      body.fileName ?? 'profile.jpg',
      body.contentType ?? 'image/jpeg',
    );
  }

  @Patch('users/:id/photo/confirm')
  @ApiOperation({
    summary: 'Confirm a staff photo upload and persist the URL',
  })
  @ApiParam({ name: 'id', description: 'managed_users UUID' })
  @ApiResponse({ status: 200, description: 'Confirmed photo URL.' })
  async confirmStaffPhoto(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { s3Key: string },
  ) {
    return this.adminManagementService.confirmStaffPhotoUpload(
      req.user.facilityId,
      id,
      body.s3Key,
    );
  }

  @Get('users/:id/reviews')
  @ApiOperation({
    summary: 'List reviews left for a managed user',
    description:
      'Reviews are stored in `staff_reviews`. For Volunteer accounts, the volunteer module owns its own reviews.',
  })
  @ApiParam({ name: 'id', description: 'managed_users UUID' })
  @ApiResponse({ status: 200, description: 'Array of staff reviews.' })
  async getUserReviews(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.adminManagementService.getUserReviews(req.user.facilityId, id);
  }

  @Get('settings/emergency-contacts')
  @ApiOperation({ summary: 'Get facility emergency contacts' })
  @ApiResponse({ status: 200, description: 'EmergencyContactsSettings JSON.' })
  async getEmergencyContacts(@Request() req: AuthenticatedRequest) {
    return this.adminManagementService.getSettingsKey(
      req.user.facilityId,
      'emergency_contacts',
    );
  }

  @Put('settings/emergency-contacts')
  @ApiOperation({ summary: 'Update facility emergency contacts' })
  async setEmergencyContacts(
    @Request() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminManagementService.setSettingsKey(
      req.user.facilityId,
      'emergency_contacts',
      body,
    );
  }

  @Get('settings/billing')
  @ApiOperation({ summary: 'Get facility billing/payment details' })
  async getBilling(@Request() req: AuthenticatedRequest) {
    return this.adminManagementService.getSettingsKey(
      req.user.facilityId,
      'billing',
    );
  }

  @Put('settings/billing')
  @ApiOperation({ summary: 'Update facility billing/payment details' })
  async setBilling(
    @Request() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminManagementService.setSettingsKey(
      req.user.facilityId,
      'billing',
      body,
    );
  }

  @Get('settings/facility-profile')
  @ApiOperation({ summary: 'Get facility profile (name/address/phone/...)' })
  async getFacilityProfile(@Request() req: AuthenticatedRequest) {
    return this.adminManagementService.getSettingsKey(
      req.user.facilityId,
      'facility_profile',
    );
  }

  @Put('settings/facility-profile')
  @ApiOperation({ summary: 'Update facility profile' })
  async setFacilityProfile(
    @Request() req: AuthenticatedRequest,
    @Body() body: Record<string, unknown>,
  ) {
    return this.adminManagementService.setSettingsKey(
      req.user.facilityId,
      'facility_profile',
      body,
    );
  }

  @Get('staff-performance')
  @ApiOperation({
    summary: 'Get staff performance metrics',
    description:
      'Admin-only. Computes completion rates from care_tasks per staff member.',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of staff performance metrics.',
  })
  async getStaffPerformance(@Request() req: AuthenticatedRequest) {
    return this.adminManagementService.getStaffPerformance(req.user.facilityId);
  }
}
