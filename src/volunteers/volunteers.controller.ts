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
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { VolunteersService } from './volunteers.service';
import { UpdateVolunteerProfileDto } from './dto/update-profile.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateReviewDto } from './dto/create-review.dto';

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
}
