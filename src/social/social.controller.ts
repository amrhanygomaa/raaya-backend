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
import { SocialService } from './social.service';
import { CreateSocialNeedDto } from './dto/create-social-need.dto';
import { CreateSocialAssessmentDto } from './dto/create-social-assessment.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Social')
@ApiBearerAuth()
@Controller('social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('needs')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List social specialist needs' })
  @ApiResponse({ status: 200, description: 'Array of social needs.' })
  async getNeeds(@Request() req: AuthenticatedRequest) {
    return this.socialService.getNeeds(req.user.facilityId);
  }

  @Post('needs')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a social specialist need' })
  @ApiResponse({ status: 201, description: 'Social need created.' })
  async createNeed(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateSocialNeedDto,
  ) {
    return this.socialService.createNeed(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get('assessment-tools')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List social assessment tools' })
  @ApiResponse({ status: 200, description: 'Array of assessment tools.' })
  async getAssessmentTools(@Request() req: AuthenticatedRequest) {
    return this.socialService.getAssessmentTools(req.user.facilityId);
  }

  @Get('resident-scores')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List social resident scores' })
  @ApiResponse({ status: 200, description: 'Array of resident scores.' })
  async getResidentScores(@Request() req: AuthenticatedRequest) {
    return this.socialService.getResidentScores(req.user.facilityId);
  }

  @Post('assessments')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Save a social assessment' })
  @ApiResponse({ status: 201, description: 'Assessment saved.' })
  async createAssessment(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateSocialAssessmentDto,
  ) {
    return this.socialService.createAssessment(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }

  @Get('kpis')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get social specialist KPIs' })
  @ApiResponse({ status: 200, description: 'Array of KPIs.' })
  async getKpis(@Request() req: AuthenticatedRequest) {
    return this.socialService.getKpis(req.user.facilityId);
  }
}
