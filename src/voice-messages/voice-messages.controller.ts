/**
 * US-15-01 – VoiceMessagesController
 *
 * Endpoints:
 *   POST   /voice-messages/upload  → Upload voice message (returns presigned URL stub)
 *   GET    /voice-messages         → List messages (filterable by residentId)
 */

import {
  Controller,
  Get,
  Post,
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
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { VoiceMessagesService } from './voice-messages.service';
import { CreateVoiceMessageDto } from './dto/create-voice-message.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Voice Messages')
@ApiBearerAuth()
@Controller('voice-messages')
export class VoiceMessagesController {
  constructor(private readonly voiceMessagesService: VoiceMessagesService) {}

  @Post('upload')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Upload a voice message (returns presigned URL stub)',
  })
  @ApiResponse({
    status: 201,
    description: 'Voice message created with upload URL.',
  })
  async upload(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateVoiceMessageDto,
  ) {
    return this.voiceMessagesService.create(req.user.facilityId, dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List voice messages' })
  @ApiQuery({
    name: 'residentId',
    required: false,
    description: 'Filter by resident UUID',
  })
  @ApiResponse({ status: 200, description: 'Array of voice messages.' })
  async findAll(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
  ) {
    return this.voiceMessagesService.findAll(req.user.facilityId, {
      residentId,
    });
  }
}
