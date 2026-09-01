import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CapabilityController } from './capability.controller.js';
import { CapabilityEvaluator } from './capability-evaluator.js';
import { CapabilityService } from './capability.service.js';
import { EntitlementResolver } from './entitlement-resolver.js';

@Module({
  imports: [PrismaModule],
  controllers: [CapabilityController],
  providers: [CapabilityEvaluator, CapabilityService, EntitlementResolver],
  exports: [CapabilityEvaluator, CapabilityService, EntitlementResolver],
})
export class AccessModule {}
