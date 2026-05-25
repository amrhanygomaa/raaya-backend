/**
 * US-06-01 – HealthModule
 *
 * Wires up the health controller + service.
 * The DatabaseModule (global) provides PG_POOL automatically.
 */

import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [GatewayModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
