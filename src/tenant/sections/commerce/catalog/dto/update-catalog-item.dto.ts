import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateCatalogItemDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt({ message: 'Price in cents must be an integer' })
  @IsOptional()
  @Min(0, { message: 'Price cannot be negative' })
  priceCents?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsOptional()
  modifierGroupIds?: string[];

  @IsBoolean()
  @IsOptional()
  isService?: boolean;

  @IsInt()
  @IsOptional()
  @Min(1)
  durationMin?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsOptional()
  metadata?: Record<string, any>;
}
