/**
 * US-13-05 – PrescriptionsModule
 */

import { Module } from '@nestjs/common';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';

@Module({
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
