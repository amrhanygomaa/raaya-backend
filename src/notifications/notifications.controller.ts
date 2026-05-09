import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';

interface Notification {
  id: string;
  userId: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

@Controller('notifications')
export class NotificationsController {
  private notifications: Notification[] = [];

  @Post()
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
  findByUser(@Param('userId') userId: string) {
    return this.notifications.filter((n) => n.userId === userId).slice(-20);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    const n = this.notifications.find((n) => n.id === id);
    if (n) n.read = true;
    return { status: 'ok' };
  }

  @Post('seed-demo')
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
