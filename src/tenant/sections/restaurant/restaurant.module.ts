import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module.js';
import { CouponsModule } from '../../../coupons/coupons.module.js';
import { TablesController } from './tables.controller.js';
import { OrdersController } from './orders.controller.js';
import { KitchenController } from './kitchen.controller.js';
import {
  PublicRestaurantOrdersController,
  PublicTableBookingsController,
} from './public-restaurant.controller.js';
import { RestaurantService } from './restaurant.service.js';

@Module({
  imports: [AuthModule, CouponsModule],
  controllers: [
    TablesController,
    OrdersController,
    KitchenController,
    PublicRestaurantOrdersController,
    PublicTableBookingsController,
  ],
  providers: [RestaurantService],
  exports: [RestaurantService],
})
export class RestaurantModule {}
