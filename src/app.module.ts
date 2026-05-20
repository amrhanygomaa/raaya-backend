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
import { NursingNotesModule } from './nursing-notes/nursing-notes.module';
import { HandoffsModule } from './handoffs/handoffs.module';
import { CareTasksModule } from './care-tasks/care-tasks.module';
import { InventoryModule } from './inventory/inventory.module';
import { DoctorVisitsModule } from './doctor-visits/doctor-visits.module';
import { MedicalSessionsModule } from './medical-sessions/medical-sessions.module';
import { PrescriptionsModule } from './prescriptions/prescriptions.module';
import { MealPlansModule } from './meal-plans/meal-plans.module';
import { ActivitiesModule } from './activities/activities.module';
import { VolunteersModule } from './volunteers/volunteers.module';
import { MemoriesModule } from './memories/memories.module';
import { VoiceMessagesModule } from './voice-messages/voice-messages.module';
import { BillingModule } from './billing/billing.module';
import { SocialModule } from './social/social.module';
import { ReportsModule } from './reports/reports.module';
import { FamilyMembersModule } from './family-members/family-members.module';

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
    NursingNotesModule,
    HandoffsModule,
    CareTasksModule,
    InventoryModule,
    DoctorVisitsModule,
    MedicalSessionsModule,
    PrescriptionsModule,
    MealPlansModule,
    ActivitiesModule,
    VolunteersModule,
    MemoriesModule,
    VoiceMessagesModule,
    BillingModule,
    SocialModule,
    ReportsModule,
    FamilyMembersModule,
  ],

  controllers: [AppController, UsersController],

  providers: [AppService, RolesGuard],
})
export class AppModule {}
