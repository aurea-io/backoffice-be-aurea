import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingPaymentStatus, DeliveryStatus, OrderChannel, OrderStatus } from '@prisma/client';

export class OrderLineDto {
  @IsString() catalogItemId!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsOptional() @IsString() guestName?: string;
}

export class CreateOrderDto {
  @IsOptional() @IsString() tableId?: string;
  @IsOptional() @IsString() customerName?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsEnum(OrderChannel) channel?: OrderChannel;
  @IsOptional() @IsString() deliveryAddress?: string;
  @IsOptional() @IsString() couponCode?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => OrderLineDto) lines!: OrderLineDto[];
}

export class UpdateOrderDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsEnum(DeliveryStatus) deliveryStatus?: DeliveryStatus;
  @IsOptional() @IsEnum(BookingPaymentStatus) paymentStatus?: BookingPaymentStatus;
  @IsOptional() @IsString() courierName?: string;
  @IsOptional() @IsString() courierPhone?: string;
  @IsOptional() @IsString() deliveryEta?: string;
}
