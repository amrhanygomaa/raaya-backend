import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { GatewayModule } from '../gateway/gateway.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [DatabaseModule, GatewayModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
