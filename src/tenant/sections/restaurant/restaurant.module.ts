import { Module } from '@nestjs/common';
import { AuthModule } from '../../../auth/auth.module.js';
import { RestaurantController, PublicRestaurantOrdersController, PublicTableBookingsController } from './restaurant.controller.js';
import { RestaurantService } from './restaurant.service.js';
import { CouponsModule } from '../../../coupons/coupons.module.js';
@Module({ imports: [AuthModule, CouponsModule], controllers: [RestaurantController, PublicRestaurantOrdersController, PublicTableBookingsController], providers: [RestaurantService] }) export class RestaurantModule {}
