import { Module } from '@nestjs/common';
import { RestaurantController, PublicRestaurantOrdersController, PublicTableBookingsController } from './restaurant.controller.js';
import { RestaurantService } from './restaurant.service.js';
import { CouponsModule } from '../../../coupons/coupons.module.js';
@Module({ imports: [CouponsModule], controllers: [RestaurantController, PublicRestaurantOrdersController, PublicTableBookingsController], providers: [RestaurantService] }) export class RestaurantModule {}
