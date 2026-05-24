import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { VideoCallsService } from './video-calls.service';
import { CreateVideoCallDto } from './dto/create-video-call.dto';
import { UpdateVideoCallStatusDto } from './dto/update-video-call-status.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Video Calls')
@ApiBearerAuth()
@Controller('video-calls')
@UseGuards(AuthGuard('jwt'))
export class VideoCallsController {
  constructor(private readonly service: VideoCallsService) {}

  @Post()
  @ApiOperation({
    summary: 'Start a video call',
    description:
      'Creates a video call record in `ringing` state. The caller is taken from the JWT.',
  })
  @ApiResponse({ status: 201, description: 'Video call created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateVideoCallDto,
  ) {
    return this.service.create(req.user.facilityId, req.user.userId, dto);
  }

  @Get('active')
  @ApiOperation({
    summary: 'List active (ringing or active) calls in the facility',
  })
  @ApiResponse({ status: 200, description: 'Array of active video calls.' })
  async active(@Request() req: AuthenticatedRequest) {
    return this.service.findActive(req.user.facilityId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'List call history',
    description:
      'Returns up to 200 most recent calls in the facility. If `userId` is provided, only calls where they were caller or callee.',
  })
  @ApiQuery({ name: 'userId', required: false })
  @ApiResponse({ status: 200, description: 'Array of video calls.' })
  async history(
    @Request() req: AuthenticatedRequest,
    @Query('userId') userId?: string,
  ) {
    return this.service.findHistory(req.user.facilityId, userId);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update video call status',
    description:
      'Setting status to a terminal value (ended, missed, declined) auto-stamps `endedAt`.',
  })
  @ApiParam({ name: 'id', description: 'video_calls UUID' })
  @ApiResponse({ status: 200, description: 'Updated video call.' })
  @ApiResponse({ status: 404, description: 'Video call not found.' })
  async updateStatus(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateVideoCallStatusDto,
  ) {
    return this.service.updateStatus(req.user.facilityId, id, dto);
  }
}
