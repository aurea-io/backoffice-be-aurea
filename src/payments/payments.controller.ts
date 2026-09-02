import { BadRequestException, Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { TenantContextGuard } from '../core/guards/tenant.guard.js';
import { FeatureGuard } from '../core/guards/feature.guard.js';
import { RolesGuard } from '../core/guards/roles.guard.js';
import { RequireFeature } from '../core/decorators/require-feature.decorator.js';
import { RequirePermissions } from '../core/decorators/permissions.decorator.js';
import { CurrentTenant } from '../core/decorators/tenant-context.decorator.js';
import { Public } from '../core/decorators/public.decorator.js';
import { FeatureConstants } from '../core/constants/index.js';
import type { TenantContext } from '../core/interfaces/context.interface.js';
import { CreatePaymentIntentDto, PaymentWebhookDto } from './payments.dto.js';
import { PaymentsService } from './payments.service.js';

@Controller('payments')
@UseGuards(TenantContextGuard, FeatureGuard, RolesGuard)
@RequireFeature(FeatureConstants.PAYMENTS)
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post('intents') @RequirePermissions('payments:write') create(@CurrentTenant() tenant: TenantContext, @Body() dto: CreatePaymentIntentDto) { return this.payments.createIntent(tenant.tenantId, dto); }
}

@Controller('payments/webhooks')
export class PublicPaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Public() @Post(':provider') webhook(@Param('provider') provider: string, @Headers('x-webhook-signature') signature: string | undefined, @Req() request: Request & { rawBody?: Buffer }, @Body() dto: PaymentWebhookDto) { const secret = process.env[`WEBHOOK_SECRET_${provider.toUpperCase()}`]; if (secret) { const expected = createHmac('sha256', secret).update(request.rawBody || Buffer.from(JSON.stringify(dto))).digest('hex'); const supplied = (signature || '').replace(/^sha256=/, ''); if (!/^[a-f0-9]{64}$/i.test(supplied) || !timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(supplied, 'hex'))) throw new BadRequestException('Firma de webhook inválida.'); } return this.payments.applyWebhook(provider, dto); }
}
