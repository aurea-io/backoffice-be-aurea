import { IsInt, IsIn, IsNotEmpty, IsString, Min } from 'class-validator';

export class LoyaltyOperationDto {
  @IsString() @IsNotEmpty() customerId!: string;
  @IsInt() @Min(1) points!: number;
  @IsIn(['earn', 'redeem']) operation!: 'earn' | 'redeem';
}
