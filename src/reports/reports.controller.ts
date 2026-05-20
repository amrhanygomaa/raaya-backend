import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ReportsService } from './reports.service';
import { SendNursingReportDto } from './dto/send-nursing-report.dto';
import { UpdateNursingReportSettingsDto } from './dto/update-nursing-report-settings.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('nursing/preview')
  @UseGuards(AuthGuard('jwt'))
  async getNursingPreview(
    @Request() req: AuthenticatedRequest,
    @Query('type') reportType?: string,
  ) {
    return this.reportsService.getNursingPreview(
      req.user.facilityId,
      reportType,
    );
  }

  @Get('nursing/completeness')
  @UseGuards(AuthGuard('jwt'))
  async getNursingCompleteness(@Request() req: AuthenticatedRequest) {
    return this.reportsService.getCompleteness(req.user.facilityId);
  }

  @Get('nursing/export')
  @UseGuards(AuthGuard('jwt'))
  async exportNursingReport(
    @Request() req: AuthenticatedRequest,
    @Query('type') reportType?: string,
    @Query('format') format?: string,
  ) {
    return this.reportsService.exportNursingReport(
      req.user.facilityId,
      reportType,
      format,
    );
  }

  @Get('nursing/history')
  @UseGuards(AuthGuard('jwt'))
  async getNursingHistory(@Request() req: AuthenticatedRequest) {
    return this.reportsService.getHistory(req.user.facilityId);
  }

  @Get('nursing/settings')
  @UseGuards(AuthGuard('jwt'))
  async getNursingSettings(@Request() req: AuthenticatedRequest) {
    return this.reportsService.getSettings(req.user.facilityId);
  }

  @Patch('nursing/settings')
  @UseGuards(AuthGuard('jwt'))
  async updateNursingSettings(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateNursingReportSettingsDto,
  ) {
    return this.reportsService.updateSettings(req.user.facilityId, dto);
  }

  @Post('nursing/send')
  @UseGuards(AuthGuard('jwt'))
  async sendNursingReport(
    @Request() req: AuthenticatedRequest,
    @Body() dto: SendNursingReportDto,
  ) {
    return this.reportsService.sendNursingReport(
      req.user.facilityId,
      req.user.userId,
      dto,
    );
  }
}
