import { Module } from '@nestjs/common';
import { AuthModule } from '../../../../auth/auth.module.js';
import { PrismaModule } from '../../../../prisma/prisma.module.js';
import { CouponsModule } from '../../marketing/coupons/coupons.module.js';
import { OrdersController, PublicOrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [AuthModule, PrismaModule, CouponsModule],
  controllers: [OrdersController, PublicOrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
