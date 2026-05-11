/**
 * US-15-07 – NotificationsController
 *
 * Persists notifications to PostgreSQL via NotificationsService.
 * Facility-scoped via JWT where available; unguarded endpoints
 * use a default facility for backward compatibility.
 *
 * Endpoints:
 *   POST   /notifications          → Create a notification
 *   GET    /notifications/:userId  → List notifications for a user (last 20)
 *   PATCH  /notifications/:id/read → Mark as read
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
  constructor(private readonly notificationsService: NotificationsService) {}

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
}
