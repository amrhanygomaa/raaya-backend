import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AiController } from './ai.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [AiController],
})
export class AiModule {}
