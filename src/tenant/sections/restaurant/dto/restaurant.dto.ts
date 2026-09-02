import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingPaymentStatus, DeliveryStatus, OrderChannel, OrderStatus, RestaurantTableStatus, TableBookingStatus } from '@prisma/client';

export class CreateTableDto { @IsInt() @Min(1) number!: number; @IsOptional() @IsInt() @Min(1) seats?: number; }
export class UpdateTableDto { @IsEnum(RestaurantTableStatus) status!: RestaurantTableStatus; }
export class OrderLineDto { @IsString() catalogItemId!: string; @IsInt() @Min(1) quantity!: number; @IsOptional() @IsString() guestName?: string; }
export class CreateOrderDto { @IsOptional() @IsString() tableId?: string; @IsOptional() @IsString() customerName?: string; @IsOptional() @IsString() notes?: string; @IsOptional() @IsEnum(OrderChannel) channel?: OrderChannel; @IsOptional() @IsString() deliveryAddress?: string; @IsOptional() @IsString() couponCode?: string; @IsArray() @ValidateNested({ each: true }) @Type(() => OrderLineDto) lines!: OrderLineDto[]; }
export class UpdateOrderDto { @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus; @IsOptional() @IsEnum(DeliveryStatus) deliveryStatus?: DeliveryStatus; @IsOptional() @IsEnum(BookingPaymentStatus) paymentStatus?: BookingPaymentStatus; @IsOptional() @IsString() courierName?: string; @IsOptional() @IsString() courierPhone?: string; @IsOptional() @IsString() deliveryEta?: string; }
export class CreateTableBookingDto { @IsString() customerName!: string; @IsOptional() @IsString() customerEmail?: string; @IsOptional() @IsString() customerPhone?: string; @IsString() date!: string; @IsString() startTime!: string; @IsOptional() @IsInt() @Min(30) durationMin?: number; @IsInt() @Min(1) partySize!: number; @IsOptional() @IsString() notes?: string; @IsOptional() @IsString() tableId?: string; }
export class UpdateTableBookingDto { @IsOptional() @IsEnum(TableBookingStatus) status?: TableBookingStatus; @IsOptional() @IsString() notes?: string; }
