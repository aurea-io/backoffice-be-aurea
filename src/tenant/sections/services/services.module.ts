import { Module } from '@nestjs/common';
import { BookingsModule } from './bookings/bookings.module.js';

@Module({
  imports: [BookingsModule],
  exports: [BookingsModule],
})
export class ServicesModule {}
