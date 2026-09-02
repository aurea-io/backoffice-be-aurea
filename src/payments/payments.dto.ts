import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsIn(['mercadopago', 'stripe', 'manual']) provider!: string;
  @IsInt() @Min(1) amountCents!: number;
  @IsString() @IsNotEmpty() currency!: string;
  @IsString() @IsNotEmpty() referenceType!: string;
  @IsString() @IsNotEmpty() referenceId!: string;
  @IsOptional() @IsString() returnUrl?: string;
}

export class PaymentWebhookDto {
  @IsString() @IsNotEmpty() externalId!: string;
  @IsIn(['pending', 'approved', 'rejected', 'refunded']) status!: string;
  @IsOptional() metadata?: Record<string, unknown>;
}
