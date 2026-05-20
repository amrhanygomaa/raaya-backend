import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { GatewayModule } from '../gateway/gateway.module';
import { EmergencyController } from './emergency.controller';
import { EmergencyService } from './emergency.service';

@Module({
  imports: [DatabaseModule, GatewayModule],
  controllers: [EmergencyController],
  providers: [EmergencyService],
  exports: [EmergencyService],
})
export class EmergencyModule {}
