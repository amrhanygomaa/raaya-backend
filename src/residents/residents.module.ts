/**
 * US-03-02 – ResidentsModule
 *
 * Wires up the residents controller + service.
 * The DatabaseModule (global) provides PG_POOL automatically.
 */

import { Module } from '@nestjs/common';
import { ResidentsController } from './residents.controller';
import { ResidentsService } from './residents.service';

@Module({
  controllers: [ResidentsController],
  providers: [ResidentsService],
  exports: [ResidentsService],
})
export class ResidentsModule {}
