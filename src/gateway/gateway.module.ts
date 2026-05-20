import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [DatabaseModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class GatewayModule {}
