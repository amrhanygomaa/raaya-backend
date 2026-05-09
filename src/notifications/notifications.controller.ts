import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';

interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

@ApiTags('Notifications')
@Controller('notifications')
export class NotificationsController {
  private notifications: Notification[] = [];

  @Post()
  @ApiOperation({ summary: 'Create a notification' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['userId', 'message', 'type'],
      properties: {
        userId: { type: 'string', example: 'nurse-seed' },
        message: {
          type: 'string',
          example:
            'Medication reminder: Aspirin 100mg for Ahmad Al-Rashid at 08:00',
        },
        type: {
          type: 'string',
          example: 'medication_reminder',
          enum: [
            'medication_reminder',
            'vital_alert',
            'complaint',
            'visit_reminder',
            'ai_summary',
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Notification created.' })
  create(@Body() body: { userId: string; message: string; type: string }) {
    const notification: Notification = {
      id: Date.now().toString(),
      userId: body.userId,
      message: body.message,
      type: body.type,
      read: false,
      createdAt: new Date().toISOString(),
    };
    this.notifications.push(notification);
    return notification;
  }

  @Get(':userId')
  @ApiOperation({ summary: 'List notifications for a user (last 20)' })
  @ApiParam({
    name: 'userId',
    description: 'User identifier',
    example: 'nurse-seed',
  })
  @ApiResponse({ status: 200, description: 'Array of notifications.' })
  findByUser(@Param('userId') userId: string) {
    return this.notifications.filter((n) => n.userId === userId).slice(-20);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.' })
  markAsRead(@Param('id') id: string) {
    const n = this.notifications.find((n) => n.id === id);
    if (n) n.read = true;
    return { status: 'ok' };
  }

  @Post('seed-demo')
  @ApiOperation({
    summary: 'Seed demo notifications',
    description:
      'Populates in-memory store with sample notifications matching the seed data.',
  })
  @ApiResponse({ status: 201, description: 'Demo notifications seeded.' })
  seedDemo() {
    const demoNotifications: Omit<Notification, 'id'>[] = [
      {
        userId: 'nurse-seed',
        message:
          'Medication reminder: Aspirin 100mg for Ahmad Al-Rashid at 08:00',
        type: 'medication_reminder',
        read: false,
        createdAt: '2025-05-08T05:00:00.000Z',
      },
      {
        userId: 'nurse-seed',
        message:
          'Vital alert: Ahmad Al-Rashid – heart rate 110 bpm (threshold 60–100)',
        type: 'vital_alert',
        read: false,
        createdAt: '2025-05-08T11:00:00.000Z',
      },
      {
        userId: 'nurse-seed',
        message: 'Vital alert: Ahmad Al-Rashid – SpO2 92% (threshold ≥95%)',
        type: 'vital_alert',
        read: true,
        createdAt: '2025-05-08T11:00:00.000Z',
      },
      {
        userId: 'admin-seed',
        message:
          'New complaint: Physical therapy schedule concern (high priority)',
        type: 'complaint',
        read: false,
        createdAt: '2025-05-07T08:00:00.000Z',
      },
      {
        userId: 'family-khalid',
        message: 'Visit approved: Khalid Al-Rashid on 2025-05-12 at 10:00',
        type: 'visit_reminder',
        read: true,
        createdAt: '2025-05-10T08:00:00.000Z',
      },
      {
        userId: 'admin-seed',
        message: 'Weekly AI summary generated for Omar Al-Ghamdi',
        type: 'ai_summary',
        read: false,
        createdAt: '2025-05-08T06:00:00.000Z',
      },
    ];

    let added = 0;
    for (const n of demoNotifications) {
      const exists = this.notifications.some(
        (existing) =>
          existing.userId === n.userId && existing.message === n.message,
      );
      if (!exists) {
        this.notifications.push({ ...n, id: `seed-${Date.now()}-${added}` });
        added++;
      }
    }

    return { status: 'ok', added, total: this.notifications.length };
  }
}
