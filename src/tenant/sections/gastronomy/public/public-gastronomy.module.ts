import { Module } from '@nestjs/common';
import { TablesModule } from '../tables/tables.module.js';
import { OrdersModule } from '../orders/orders.module.js';
import {
  PublicRestaurantOrdersController,
  PublicTableBookingsController,
} from './public-gastronomy.controller.js';

@Module({
  imports: [TablesModule, OrdersModule],
  controllers: [
    PublicRestaurantOrdersController,
    PublicTableBookingsController,
  ],
})
export class PublicGastronomyModule {}
