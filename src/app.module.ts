import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './jobs/jobs.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [JobsModule, NotificationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }