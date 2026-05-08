import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { JobsModule } from './jobs/jobs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';

import { UsersController } from './users/users.controller';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [JobsModule, NotificationsModule, AiModule, AuthModule],

  controllers: [AppController, UsersController],

  providers: [AppService, RolesGuard],
})
export class AppModule {}
