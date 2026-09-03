import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { RestaurantTableStatus, TableBookingStatus } from '@prisma/client';

export class CreateTableDto {
  @IsInt()
  @Min(1)
  number!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  seats?: number;
}

export class UpdateTableDto {
  @IsEnum(RestaurantTableStatus)
  status!: RestaurantTableStatus;
}

export class CreateTableBookingDto {
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
  @Min(30)
  durationMin?: number;

  @IsInt()
  @Min(1)
  partySize!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  tableId?: string;
}

export class UpdateTableBookingDto {
  @IsOptional()
  @IsEnum(TableBookingStatus)
  status?: TableBookingStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
