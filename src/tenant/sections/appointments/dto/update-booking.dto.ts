import { IsEnum, IsOptional, IsString } from 'class-validator';
import { BookingPaymentStatus, BookingStatus } from '@prisma/client';

export class UpdateBookingDto {
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @IsOptional() @IsEnum(BookingPaymentStatus) paymentStatus?: BookingPaymentStatus;
  @IsOptional() @IsString() notes?: string;
}
