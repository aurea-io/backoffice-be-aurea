import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  catalogItemId!: string;

  @IsString()
  customerName!: string;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsString()
  date!: string;

  @IsString()
  startTime!: string;

  @IsOptional()
  @IsInt()
  @Min(15)
  durationMin?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
