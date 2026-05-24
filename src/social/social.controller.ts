import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
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
  constructor(
    private readonly socialService: SocialService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

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

  @Get('assessments')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List social assessment history' })
  @ApiQuery({ name: 'residentId', required: false })
  @ApiResponse({ status: 200, description: 'Array of past assessments.' })
  async getAssessmentHistory(
    @Request() req: AuthenticatedRequest,
    @Query('residentId') residentId?: string,
  ) {
    return this.socialService.getAssessmentHistory(
      req.user.facilityId,
      residentId,
    );
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

  @Get('gds-questions')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get GDS (or other scale) assessment questions',
    description:
      'Returns questions from assessment_questions table. Facility-specific questions override global ones.',
  })
  @ApiQuery({ name: 'scale', required: false, example: 'GDS' })
  @ApiResponse({
    status: 200,
    description: 'Array of questions ordered by sort_order.',
  })
  async getGdsQuestions(
    @Request() req: AuthenticatedRequest,
    @Query('scale') scale?: string,
  ) {
    const targetScale = scale?.toUpperCase() ?? 'GDS';
    const res = await this.pool.query<Record<string, unknown>>(
      `SELECT id, question_key, text_ar, question_type, options, sort_order
       FROM assessment_questions
       WHERE scale = $1 AND is_active = TRUE
         AND (facility_id IS NULL OR facility_id = $2)
       ORDER BY (facility_id IS NOT NULL) DESC, sort_order ASC`,
      [targetScale, req.user.facilityId],
    );
    return res.rows.map((row) => ({
      id: row.question_key ?? row.id,
      text: row.text_ar,
      type: row.question_type,
      options: row.options ?? null,
    }));
  }

  @Get('assessment-tools/:toolId/questions')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({
    summary: 'Get questions for a specific assessment tool',
    description:
      'Looks up the tool by ID, reads its `scale` (e.g. GDS), and returns the matching ' +
      'questions. Returns an empty array if the tool has no linked scale.',
  })
  @ApiResponse({ status: 200, description: 'Array of questions.' })
  async getToolQuestions(
    @Request() req: AuthenticatedRequest,
    @Param('toolId') toolId: string,
  ) {
    const tool = await this.pool.query<Record<string, unknown>>(
      `SELECT scale, name FROM social_assessment_tools
       WHERE id = $1 AND facility_id = $2`,
      [toolId, req.user.facilityId],
    );
    if (tool.rows.length === 0) return [];

    const scale =
      (tool.rows[0].scale as string | null) ??
      (tool.rows[0].name as string | null);
    if (!scale || scale.trim().length === 0) return [];

    const res = await this.pool.query<Record<string, unknown>>(
      `SELECT id, question_key, text_ar, question_type, options, sort_order
       FROM assessment_questions
       WHERE scale = $1 AND is_active = TRUE
         AND (facility_id IS NULL OR facility_id = $2)
       ORDER BY (facility_id IS NOT NULL) DESC, sort_order ASC`,
      [scale, req.user.facilityId],
    );
    return res.rows.map((row) => ({
      id: row.question_key ?? row.id,
      text: row.text_ar,
      type: row.question_type,
      options: row.options ?? null,
    }));
  }
}
