import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service.js';
import type { LoyaltyOperationDto } from './loyalty.dto.js';

@Injectable()
export class LoyaltyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.loyaltyAccount.findMany({ where: { tenantId }, include: { customer: { select: { id: true, name: true, email: true, phone: true } } }, orderBy: { points: 'desc' } });
  }

  async operate(tenantId: string, dto: LoyaltyOperationDto) {
    const customer = await this.prisma.customer.findFirst({ where: { id: dto.customerId, tenantId } });
    if (!customer) throw new NotFoundException('Cliente no encontrado.');
    const account = await this.prisma.loyaltyAccount.upsert({ where: { tenantId_customerId: { tenantId, customerId: dto.customerId } }, create: { tenantId, customerId: dto.customerId }, update: {} });
    const points = dto.operation === 'earn' ? account.points + dto.points : account.points - dto.points;
    if (points < 0) throw new BadRequestException('El cliente no tiene puntos suficientes.');
    const tier = points >= 1000 ? 'premium' : points >= 500 ? 'plus' : 'standard';
    return this.prisma.loyaltyAccount.update({ where: { id: account.id }, data: { points, tier }, include: { customer: { select: { id: true, name: true } } } });
  }
}
