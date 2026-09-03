import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreateCouponDto { @IsString() @IsNotEmpty() code!: string; @IsEnum(DiscountType) type!: DiscountType; @IsInt() @Min(1) value!: number; @IsOptional() @IsInt() @Min(1) maxUses?: number; @IsOptional() @IsDateString() expiresAt?: string; }
