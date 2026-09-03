import { Injectable } from '@nestjs/common';
import { BookingsService } from '../services/bookings/bookings.service.js';
import type { CreateBookingDto } from '../services/bookings/dto/create-booking.dto.js';
import type { UpdateBookingDto } from '../services/bookings/dto/update-booking.dto.js';

@Injectable()
export class AppointmentsService {
  constructor(private readonly bookingsService: BookingsService) {}

  list(tenantId: string, from?: string, to?: string) {
    return this.bookingsService.list(tenantId, from, to);
  }

  availability(publicId: string, date: string, catalogItemId?: string) {
    return this.bookingsService.availability(publicId, date, catalogItemId);
  }

  create(tenantId: string, dto: CreateBookingDto) {
    return this.bookingsService.create(tenantId, dto);
  }

  createByPublicId(publicId: string, dto: CreateBookingDto) {
    return this.bookingsService.createByPublicId(publicId, dto);
  }

  update(tenantId: string, id: string, dto: UpdateBookingDto) {
    return this.bookingsService.update(tenantId, id, dto);
  }
}
