import { Module } from '@nestjs/common';
import { CatalogModule } from './catalog/catalog.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { PosModule } from './pos/pos.module.js';

@Module({
  imports: [CatalogModule, InventoryModule, PosModule],
  exports: [CatalogModule, InventoryModule, PosModule],
})
export class CommerceModule {}
