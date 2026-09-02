import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class PlanPriceDto {
  @IsString() @IsNotEmpty() currency!: string;
  @IsInt() @Min(0) amountCents!: number;
  @IsString() @IsNotEmpty() interval!: string;
  @IsOptional() limits?: Record<string, unknown>;
}

export class CreatePlanDto {
  @IsString() @IsNotEmpty() key!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) includedFeatures?: string[];
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => PlanPriceDto) prices?: PlanPriceDto[];
}
