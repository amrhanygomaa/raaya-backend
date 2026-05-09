import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { DatabaseModule } from './database/database.module';
import { JobsModule } from './jobs/jobs.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { ResidentsModule } from './residents/residents.module';
import { MedicationsModule } from './medications/medications.module';
import { FamilyBridgeModule } from './family-bridge/family-bridge.module';
import { HealthModule } from './health/health.module';
import { KpiModule } from './kpi/kpi.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { AdminManagementModule } from './admin-management/admin-management.module';

import { UsersController } from './users/users.controller';
import { RolesGuard } from './auth/roles.guard';

@Module({
  imports: [
    DatabaseModule,
    JobsModule,
    NotificationsModule,
    AiModule,
    AuthModule,
    ResidentsModule,
    MedicationsModule,
    FamilyBridgeModule,
    HealthModule,
    KpiModule,
    ComplaintsModule,
    AdminManagementModule,
  ],

  controllers: [AppController, UsersController],

  providers: [AppService, RolesGuard],
})
export class AppModule {}
