import { Module } from '@nestjs/common';
import { GastronomyModule } from '../gastronomy/gastronomy.module.js';
import { RestaurantService } from './restaurant.service.js';

@Module({
  imports: [GastronomyModule],
  providers: [RestaurantService],
  exports: [GastronomyModule, RestaurantService],
})
export class RestaurantModule {}
