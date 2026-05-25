import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { JobsController } from './jobs.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [JobsController],
})
export class JobsModule {}
