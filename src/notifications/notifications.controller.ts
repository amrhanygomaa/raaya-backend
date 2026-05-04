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
        return this.notifications
            .filter(n => n.userId === userId)
            .slice(-20);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string) {
        const n = this.notifications.find(n => n.id === id);
        if (n) n.read = true;
        return { status: 'ok' };
    }
}