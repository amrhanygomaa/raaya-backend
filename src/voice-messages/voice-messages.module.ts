/**
 * US-15-01 – VoiceMessagesModule
 */

import { Module } from '@nestjs/common';
import { VoiceMessagesController } from './voice-messages.controller';
import { VoiceMessagesService } from './voice-messages.service';

@Module({
  controllers: [VoiceMessagesController],
  providers: [VoiceMessagesService],
  exports: [VoiceMessagesService],
})
export class VoiceMessagesModule {}
