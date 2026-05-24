import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AiMediaService } from './ai-media.service';
import {
  ConfirmAiMediaDto,
  RequestAiMediaDto,
} from './dto/request-ai-media.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('AI Media')
@ApiBearerAuth()
@Controller('ai/media')
@UseGuards(AuthGuard('jwt'))
export class AiMediaController {
  constructor(private readonly service: AiMediaService) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Request a presigned S3 URL to upload AI-analyzed media',
    description:
      'Creates an `ai_media` row in `pending` state and returns a 15-min PUT URL. ' +
      'The client uploads bytes directly to S3, then calls `PATCH :id/confirm`.',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL + media record.',
  })
  async requestUpload(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RequestAiMediaDto,
  ) {
    return this.service.requestUpload(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Patch(':id/confirm')
  @ApiOperation({
    summary: 'Confirm an AI media upload is complete',
    description:
      'Flips status from `pending` to `confirmed` and (optionally) stores notes. ' +
      'Returns the final media URL if `S3_MEDIA_PUBLIC_BASE_URL` is configured.',
  })
  @ApiParam({ name: 'id', description: 'ai_media UUID' })
  @ApiResponse({ status: 200, description: 'Confirmed AI media record.' })
  @ApiResponse({
    status: 404,
    description: 'Media not found or already confirmed.',
  })
  async confirmUpload(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: ConfirmAiMediaDto,
  ) {
    return this.service.confirmUpload(req.user.facilityId, id, dto);
  }
}
