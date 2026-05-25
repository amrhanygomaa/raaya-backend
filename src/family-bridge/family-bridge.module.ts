/**
 * US-05-01 – FamilyBridgeModule
 *
 * Wires up the family-bridge controller + service.
 * The DatabaseModule (global) provides PG_POOL automatically.
 */

import { Module } from '@nestjs/common';
import { GatewayModule } from '../gateway/gateway.module';
import { FamilyBridgeController } from './family-bridge.controller';
import { FamilyBridgeService } from './family-bridge.service';

@Module({
  imports: [GatewayModule],
  controllers: [FamilyBridgeController],
  providers: [FamilyBridgeService],
  exports: [FamilyBridgeService],
})
export class FamilyBridgeModule {}
