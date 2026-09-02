import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreatePaymentIntentDto, PaymentWebhookDto } from './payments.dto.js';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createIntent(tenantId: string, dto: CreatePaymentIntentDto) {
    const payment = await this.prisma.payment.create({ data: { tenantId, provider: dto.provider, amountCents: dto.amountCents, currency: dto.currency.toUpperCase(), referenceType: dto.referenceType, referenceId: dto.referenceId, status: 'pending' } });
    try {
      const checkout = dto.provider === 'stripe' ? await this.createStripeCheckout(payment.id, dto) : dto.provider === 'mercadopago' ? await this.createMercadoPagoCheckout(payment.id, dto) : null;
      if (checkout) return this.prisma.payment.update({ where: { id: payment.id }, data: { externalId: checkout.externalId, checkoutUrl: checkout.checkoutUrl, metadata: checkout.metadata } });
    } catch (error) {
      await this.prisma.payment.update({ where: { id: payment.id }, data: { metadata: { error: error instanceof Error ? error.message : 'provider_error' } } });
    }
    return { ...payment, mode: dto.provider === 'manual' ? 'manual' : 'provider_unavailable' };
  }

  async applyWebhook(provider: string, dto: PaymentWebhookDto) {
    const payment = await this.prisma.payment.findFirst({ where: { provider, externalId: dto.externalId } });
    if (!payment) throw new NotFoundException('Payment intent not found.');
    return this.prisma.payment.update({ where: { id: payment.id }, data: { status: dto.status as any, metadata: dto.metadata as any } });
  }

  private async createStripeCheckout(paymentId: string, dto: CreatePaymentIntentDto) {
    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) return null;
    const body = new URLSearchParams({ mode: 'payment', 'line_items[0][price_data][currency]': dto.currency.toLowerCase(), 'line_items[0][price_data][product_data][name]': `${dto.referenceType} ${dto.referenceId}`, 'line_items[0][price_data][unit_amount]': String(dto.amountCents), 'line_items[0][quantity]': '1', success_url: dto.returnUrl || 'http://localhost:4173/payment/success', cancel_url: dto.returnUrl || 'http://localhost:4173/payment/canceled' });
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    if (!response.ok) throw new Error(`Stripe HTTP ${response.status}`);
    const result = await response.json() as { id: string; url: string };
    return { externalId: result.id, checkoutUrl: result.url, metadata: { provider: 'stripe' } };
  }

  private async createMercadoPagoCheckout(paymentId: string, dto: CreatePaymentIntentDto) {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!token) return null;
    const response = await fetch('https://api.mercadopago.com/checkout/preferences', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ external_reference: paymentId, items: [{ id: dto.referenceId, title: `${dto.referenceType} ${dto.referenceId}`, quantity: 1, currency_id: dto.currency.toUpperCase(), unit_price: dto.amountCents / 100 }], back_urls: { success: dto.returnUrl || 'http://localhost:4173/payment/success', failure: dto.returnUrl || 'http://localhost:4173/payment/canceled', pending: dto.returnUrl || 'http://localhost:4173/payment/pending' } }) });
    if (!response.ok) throw new Error(`Mercado Pago HTTP ${response.status}`);
    const result = await response.json() as { id: string; init_point?: string; sandbox_init_point?: string };
    return { externalId: result.id, checkoutUrl: result.init_point || result.sandbox_init_point || null, metadata: { provider: 'mercadopago' } };
  }
}
