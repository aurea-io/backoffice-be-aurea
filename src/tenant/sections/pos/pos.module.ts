import { Module } from '@nestjs/common';
import { PosModule as CommercePosModule } from '../commerce/pos/pos.module.js';

@Module({
  imports: [CommercePosModule],
  exports: [CommercePosModule],
})
export class PosModule {}
