/**
 * US-14-03 – VolunteersController
 *
 * Endpoints:
 *   GET    /volunteers/profile         → Get own profile
 *   PUT    /volunteers/profile         → Upsert profile
 *   GET    /volunteers/opportunities   → List opportunities
 *   POST   /volunteers/bookings        → Create booking
 *   GET    /volunteers/bookings        → List own bookings
 */

import {
  Controller,
  Delete,
  Get,
  Put,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { VolunteersService } from './volunteers.service';
import { UpdateVolunteerProfileDto } from './dto/update-profile.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpsertOpportunityDto } from './dto/upsert-opportunity.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Volunteers')
@ApiBearerAuth()
@Controller('volunteers')
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get own volunteer profile' })
  @ApiResponse({ status: 200, description: 'Volunteer profile.' })
  async getProfile(@Request() req: AuthenticatedRequest) {
    return this.volunteersService.getProfile(
      req.user.facilityId,
      req.user.userId,
    );
  }

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Upsert own volunteer profile' })
  @ApiResponse({ status: 200, description: 'Updated volunteer profile.' })
  async upsertProfile(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateVolunteerProfileDto,
  ) {
    return this.volunteersService.upsertProfile(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get('opportunities')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List volunteer opportunities' })
  @ApiResponse({ status: 200, description: 'Array of opportunities.' })
  async getOpportunities(@Request() req: AuthenticatedRequest) {
    return this.volunteersService.getOpportunities(req.user.facilityId);
  }

  @Post('opportunities')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a volunteer opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created.' })
  async createOpportunity(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpsertOpportunityDto,
  ) {
    return this.volunteersService.createOpportunity(req.user.facilityId, dto);
  }

  @Patch('opportunities/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update a volunteer opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, description: 'Opportunity updated.' })
  async updateOpportunity(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpsertOpportunityDto,
  ) {
    return this.volunteersService.updateOpportunity(
      req.user.facilityId,
      id,
      dto,
    );
  }

  @Delete('opportunities/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete a volunteer opportunity' })
  @ApiParam({ name: 'id', description: 'Opportunity UUID' })
  @ApiResponse({ status: 200, description: 'Opportunity deleted.' })
  async deleteOpportunity(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.volunteersService.deleteOpportunity(req.user.facilityId, id);
  }

  @Post('bookings')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a volunteer booking' })
  @ApiResponse({ status: 201, description: 'Booking created.' })
  async createBooking(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateBookingDto,
  ) {
    return this.volunteersService.createBooking(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get('bookings')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List own volunteer bookings' })
  @ApiResponse({ status: 200, description: 'Array of bookings.' })
  async getBookings(@Request() req: AuthenticatedRequest) {
    return this.volunteersService.getBookings(
      req.user.facilityId,
      req.user.userId,
    );
  }

  @Patch('bookings/:id/cancel')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Cancel own volunteer booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled.' })
  async cancelBooking(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.volunteersService.updateBookingStatus(
      req.user.facilityId,
      req.user.userId,
      id,
      'cancelled',
    );
  }

  @Patch('bookings/:id/confirm-attendance')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Confirm attendance for own volunteer booking' })
  @ApiResponse({ status: 200, description: 'Booking marked as done.' })
  async confirmAttendance(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.volunteersService.updateBookingStatus(
      req.user.facilityId,
      req.user.userId,
      id,
      'done',
    );
  }

  @Get('certificates')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List own volunteer certificates' })
  @ApiResponse({ status: 200, description: 'Array of certificates.' })
  async getCertificates(@Request() req: AuthenticatedRequest) {
    return this.volunteersService.getCertificates(
      req.user.facilityId,
      req.user.userId,
    );
  }

  @Get('ratings')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List own volunteer ratings' })
  @ApiResponse({ status: 200, description: 'Array of ratings.' })
  async getRatings(@Request() req: AuthenticatedRequest) {
    return this.volunteersService.getRatings(
      req.user.facilityId,
      req.user.userId,
    );
  }

  @Post('reviews')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Submit a volunteer review' })
  @ApiResponse({ status: 201, description: 'Review created.' })
  async createReview(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateReviewDto,
  ) {
    return this.volunteersService.createReview(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get('reviews')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List own volunteer reviews' })
  @ApiResponse({ status: 200, description: 'Array of reviews.' })
  async getReviews(@Request() req: AuthenticatedRequest) {
    return this.volunteersService.getReviews(
      req.user.facilityId,
      req.user.userId,
    );
  }

  @Post('documents/upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Request a presigned S3 URL to upload a volunteer document',
    description:
      'Creates a `volunteer_documents` row in `pending` state and returns a ' +
      '15-min PUT URL. Client uploads bytes to S3 then calls PATCH `:id/confirm`.',
  })
  @ApiResponse({ status: 201, description: 'Presigned URL + document record.' })
  async requestDocumentUpload(
    @Request() req: AuthenticatedRequest,
    @Body()
    body: { documentType: string; fileName: string; contentType: string },
  ) {
    return this.volunteersService.requestDocumentUpload(
      req.user.facilityId,
      req.user.userId,
      body,
    );
  }

  @Patch('documents/:id/confirm')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Confirm a volunteer document upload is complete',
  })
  @ApiParam({ name: 'id', description: 'volunteer_documents UUID' })
  @ApiResponse({ status: 200, description: 'Confirmed document.' })
  @ApiResponse({
    status: 404,
    description: 'Document not found or already confirmed.',
  })
  async confirmDocumentUpload(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.volunteersService.confirmDocumentUpload(
      req.user.facilityId,
      req.user.userId,
      id,
    );
  }

  @Post('profile/public-link')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary:
      'Generate a tokenized public-share URL for the caller volunteer profile',
    description:
      'TTL is controlled by env `VOLUNTEER_PUBLIC_LINK_TTL_DAYS` (default 30 days). ' +
      'Base URL is `VOLUNTEER_PUBLIC_BASE_URL` (default https://app.helpers-tech.com/v).',
  })
  @ApiResponse({
    status: 201,
    description: 'Generated URL with expiry.',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        token: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  async createPublicLink(@Request() req: AuthenticatedRequest) {
    return this.volunteersService.createPublicProfileLink(
      req.user.facilityId,
      req.user.userId,
    );
  }
}
