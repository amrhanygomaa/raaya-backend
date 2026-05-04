import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { JobsModule } from './jobs/jobs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [JobsModule, NotificationsModule, AiModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }