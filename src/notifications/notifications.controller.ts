/**
 * US-15-07 – NotificationsController
 *
 * Persists notifications to PostgreSQL via NotificationsService.
 * Facility-scoped via JWT where available; unguarded endpoints
 * use a default facility for backward compatibility.
 *
 * Endpoints:
 *   POST   /notifications                 → Create a notification
 *   GET    /notifications/:userId         → List notifications for a user (last 20)
 *   PATCH  /notifications/:id/read        → Mark as read
 *   DELETE /notifications/:id             → Delete one notification
 *   DELETE /notifications/user/:userId    → Delete all notifications for a user
 *   POST   /notifications/push-tokens     → Register FCM/APNS token
 *   DELETE /notifications/push-tokens/:token → Remove a push token
 */

import {
  Controller,
  Delete,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../database/database.module';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

interface AuthenticatedRequest {
  user: {
    userId: string;
    email: string;
    roles: string[];
    facilityId: string;
  };
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject(PG_POOL) private readonly pool: Pool,
  ) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a notification' })
  @ApiResponse({ status: 201, description: 'Notification created.' })
  async create(
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(req.user.facilityId, dto);
  }

  @Get(':userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'List notifications for a user (last 20)' })
  @ApiParam({
    name: 'userId',
    description: 'User identifier',
    example: 'nurse-seed',
  })
  @ApiResponse({ status: 200, description: 'Array of notifications.' })
  async findByUser(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.notificationsService.findByUser(req.user.facilityId, userId);
  }

  @Patch(':id/read')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.facilityId, id);
  }

  @Delete('user/:userId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete all notifications for a user' })
  @ApiParam({ name: 'userId', description: 'User identifier' })
  @ApiResponse({ status: 200, description: 'Notifications deleted.' })
  async deleteByUser(
    @Request() req: AuthenticatedRequest,
    @Param('userId') userId: string,
  ) {
    return this.notificationsService.deleteByUser(req.user.facilityId, userId);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  @ApiResponse({ status: 200, description: 'Notification deleted.' })
  async deleteOne(
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.notificationsService.deleteOne(req.user.facilityId, id);
  }

  @Post('push-tokens')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Register a FCM/APNS push token for the current user' })
  @ApiResponse({ status: 201, description: 'Token registered.' })
  async registerPushToken(
    @Request() req: AuthenticatedRequest,
    @Body() body: { token: string; platform: 'ios' | 'android' },
  ) {
    const { token, platform } = body;
    if (!token || !platform || !['ios', 'android'].includes(platform)) {
      throw new BadRequestException('token and platform (ios|android) are required');
    }
    await this.pool.query(
      `INSERT INTO push_tokens (facility_id, user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id, token)
       DO UPDATE SET platform = $4, updated_at = NOW()`,
      [req.user.facilityId, req.user.userId, token, platform],
    );
    return { status: 'ok', token };
  }

  @Delete('push-tokens/:token')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Remove a push token (e.g. on logout)' })
  @ApiParam({ name: 'token', description: 'FCM/APNS token to remove' })
  @ApiResponse({ status: 200, description: 'Token removed.' })
  async removePushToken(
    @Request() req: AuthenticatedRequest,
    @Param('token') token: string,
  ) {
    await this.pool.query(
      `DELETE FROM push_tokens WHERE user_id = $1 AND token = $2`,
      [req.user.userId, token],
    );
    return { status: 'ok' };
  }
}
