import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

@Module({
  imports: [DatabaseModule],
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
