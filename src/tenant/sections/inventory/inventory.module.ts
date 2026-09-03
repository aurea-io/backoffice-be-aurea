import { Module } from '@nestjs/common';
import { InventoryModule as CommerceInventoryModule } from '../commerce/inventory/inventory.module.js';

@Module({
  imports: [CommerceInventoryModule],
  exports: [CommerceInventoryModule],
})
export class InventoryModule {}
