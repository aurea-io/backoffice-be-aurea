import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service.js';
import type { CreateCouponDto } from './coupons.dto.js';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}
  list(tenantId: string) { return this.prisma.coupon.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } }); }
  create(tenantId: string, dto: CreateCouponDto) { if (dto.type === DiscountType.percentage && dto.value > 100) throw new BadRequestException('El porcentaje no puede superar 100.'); return this.prisma.coupon.create({ data: { tenantId, code: dto.code.trim().toUpperCase(), type: dto.type, value: dto.value, maxUses: dto.maxUses, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined } }); }
  async deactivate(tenantId: string, id: string) { const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } }); if (!coupon) throw new NotFoundException('Cupón no encontrado.'); return this.prisma.coupon.update({ where: { id }, data: { isActive: false } }); }
  async redeem(tenantId: string, code: string, subtotalCents: number) {
    const coupon = await this.prisma.coupon.findFirst({ where: { tenantId, code: code.trim().toUpperCase(), isActive: true } });
    if (!coupon || (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) || (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses)) throw new BadRequestException('El cupón no es válido o ya no está disponible.');
    const discountCents = coupon.type === DiscountType.percentage ? Math.floor(subtotalCents * coupon.value / 100) : Math.min(subtotalCents, coupon.value);
    await this.prisma.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } });
    return { code: coupon.code, discountCents };
  }
}
