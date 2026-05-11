/**
 * US-12-03 – HandoffsModule
 *
 * Wires up the shift handoffs controller + service.
 * The DatabaseModule (global) provides PG_POOL automatically.
 */

import { Module } from '@nestjs/common';
import { HandoffsController } from './handoffs.controller';
import { HandoffsService } from './handoffs.service';

@Module({
  controllers: [HandoffsController],
  providers: [HandoffsService],
  exports: [HandoffsService],
})
export class HandoffsModule {}
