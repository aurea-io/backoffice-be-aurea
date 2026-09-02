import { IsArray, IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus, RestaurantTableStatus } from '@prisma/client';

export class CreateTableDto { @IsInt() @Min(1) number!: number; @IsOptional() @IsInt() @Min(1) seats?: number; }
export class UpdateTableDto { @IsEnum(RestaurantTableStatus) status!: RestaurantTableStatus; }
export class OrderLineDto { @IsString() catalogItemId!: string; @IsInt() @Min(1) quantity!: number; @IsOptional() @IsString() guestName?: string; }
export class CreateOrderDto { @IsOptional() @IsString() tableId?: string; @IsOptional() @IsString() customerName?: string; @IsOptional() @IsString() notes?: string; @IsArray() @ValidateNested({ each: true }) @Type(() => OrderLineDto) lines!: OrderLineDto[]; }
export class UpdateOrderDto { @IsEnum(OrderStatus) status!: OrderStatus; }
