import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCategoryDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateModifierOptionDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsInt() @Min(0) priceDeltaCents?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateModifierGroupDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsOptional() @IsInt() @Min(0) minSelections?: number;
  @IsOptional() @IsInt() @Min(0) maxSelections?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() options?: CreateModifierOptionDto[];
}

export class UpdateModifierGroupDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsInt() @Min(0) minSelections?: number;
  @IsOptional() @IsInt() @Min(0) maxSelections?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateModifierOptionDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsInt() @Min(0) priceDeltaCents?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
