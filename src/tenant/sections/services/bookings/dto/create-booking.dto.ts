import { IsEmail, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateBookingDto {
  @IsString() catalogItemId!: string;
  @IsString() customerName!: string;
  @IsOptional() @IsEmail() customerEmail?: string;
  @IsOptional() @IsString() customerPhone?: string;
  @IsString() @Matches(/^\d{4}-\d{2}-\d{2}$/) date!: string;
  @IsString() @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime!: string;
  @IsOptional() @IsInt() @Min(1) durationMin?: number;
  @IsOptional() @IsString() notes?: string;
}
