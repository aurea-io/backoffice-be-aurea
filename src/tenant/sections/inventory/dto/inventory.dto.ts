import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateInventoryDto {
  @IsString() name!: string;
  @IsOptional() @IsString() sku?: string;
  @IsOptional() @IsString() unit?: string;
  @IsNumber() @Min(0) quantity!: number;
  @IsOptional() @IsNumber() @Min(0) minimum?: number;
  @IsOptional() @IsInt() @Min(0) costCents?: number;
}

export class AdjustInventoryDto {
  @IsNumber() quantity!: number;
  @IsOptional() @IsString() reason?: string;
}
