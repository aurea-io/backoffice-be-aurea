import { Module } from '@nestjs/common';
import { AuthModule } from '../../../../auth/auth.module.js';
import { PrismaModule } from '../../../../prisma/prisma.module.js';
import { LoyaltyController } from './loyalty.controller.js';
import { LoyaltyService } from './loyalty.service.js';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
