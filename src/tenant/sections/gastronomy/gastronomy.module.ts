import { Module } from '@nestjs/common';
import { TablesModule } from './tables/tables.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { KitchenModule } from './kitchen/kitchen.module.js';
import { PublicGastronomyModule } from './public/public-gastronomy.module.js';

@Module({
  imports: [
    TablesModule,
    OrdersModule,
    KitchenModule,
    PublicGastronomyModule,
  ],
  exports: [
    TablesModule,
    OrdersModule,
    KitchenModule,
    PublicGastronomyModule,
  ],
})
export class GastronomyModule {}
