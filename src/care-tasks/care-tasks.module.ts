/**
 * US-12-05 – CareTasksModule
 */

import { Module } from '@nestjs/common';
import { CareTasksController } from './care-tasks.controller';
import { CareTasksService } from './care-tasks.service';

@Module({
  controllers: [CareTasksController],
  providers: [CareTasksService],
  exports: [CareTasksService],
})
export class CareTasksModule {}
