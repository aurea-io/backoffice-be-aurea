import { Module } from '@nestjs/common';
import { AuthModule } from '../../../../auth/auth.module.js';
import { PrismaModule } from '../../../../prisma/prisma.module.js';
import { OrdersModule } from '../../commerce/orders/orders.module.js';
import { KitchenController } from './kitchen.controller.js';
import { KitchenService } from './kitchen.service.js';

@Module({
  imports: [AuthModule, PrismaModule, OrdersModule],
  controllers: [KitchenController],
  providers: [KitchenService],
  exports: [KitchenService],
})
export class KitchenModule {}
