import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class OpenCashDto {
  @IsInt()
  @Min(0)
  openingCents!: number;
}

export class CloseCashDto {
  @IsInt()
  @Min(0)
  closingCents!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
