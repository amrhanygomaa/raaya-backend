import {
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UserProgressService } from './user-progress.service';
import { AddPointsDto } from './dto/add-points.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('User Progress')
@ApiBearerAuth()
@Controller('user-progress')
@UseGuards(AuthGuard('jwt'))
export class UserProgressController {
  constructor(private readonly service: UserProgressService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get the caller progress (auto-creates a row with zeros)',
  })
  @ApiResponse({ status: 200, description: 'UserProgress object.' })
  async getMe(@Request() req: AuthenticatedRequest) {
    return this.service.getOrCreate(req.user.facilityId, req.user.userId);
  }

  @Post('points')
  @ApiOperation({
    summary: 'Add points to the caller progress and bump activity counters',
  })
  @ApiResponse({ status: 201, description: 'Updated UserProgress object.' })
  async addPoints(
    @Request() req: AuthenticatedRequest,
    @Body() dto: AddPointsDto,
  ) {
    return this.service.addPoints(req.user.facilityId, req.user.userId, dto);
  }
}
