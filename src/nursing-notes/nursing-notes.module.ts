/**
 * US-12-01 – NursingNotesModule
 *
 * Wires up the nursing notes controller + service.
 * The DatabaseModule (global) provides PG_POOL automatically.
 */

import { Module } from '@nestjs/common';
import { NursingNotesController } from './nursing-notes.controller';
import { NursingNotesService } from './nursing-notes.service';

@Module({
  controllers: [NursingNotesController],
  providers: [NursingNotesService],
  exports: [NursingNotesService],
})
export class NursingNotesModule {}
