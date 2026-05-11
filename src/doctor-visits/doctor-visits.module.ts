/**
 * US-13-01 – DoctorVisitsModule
 */

import { Module } from '@nestjs/common';
import { DoctorVisitsController } from './doctor-visits.controller';
import { DoctorVisitsService } from './doctor-visits.service';

@Module({
  controllers: [DoctorVisitsController],
  providers: [DoctorVisitsService],
  exports: [DoctorVisitsService],
})
export class DoctorVisitsModule {}
