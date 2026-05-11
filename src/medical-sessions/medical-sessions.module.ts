/**
 * US-13-03 – MedicalSessionsModule
 */

import { Module } from '@nestjs/common';
import { MedicalSessionsController } from './medical-sessions.controller';
import { MedicalSessionsService } from './medical-sessions.service';

@Module({
  controllers: [MedicalSessionsController],
  providers: [MedicalSessionsService],
  exports: [MedicalSessionsService],
})
export class MedicalSessionsModule {}
