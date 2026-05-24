import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AiController } from './ai.controller';
import { AiMediaController } from './ai-media.controller';
import { AiMediaService } from './ai-media.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AiController, AiMediaController],
  providers: [AiMediaService],
})
export class AiModule {}
