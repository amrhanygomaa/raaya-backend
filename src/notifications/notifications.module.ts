/**
 * US-15-07 – NotificationsModule
 *
 * Wires up the notifications controller + DB-backed service.
 * The DatabaseModule (global) provides PG_POOL automatically.
 */

import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
