import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CreatePlanDto } from './dto/create-plan.dto.js';
import type { AssignPlanDto } from './dto/assign-plan.dto.js';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() { return this.prisma.plan.findMany({ include: { prices: true, planAddons: { include: { addon: true } } }, orderBy: { createdAt: 'desc' } }); }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({ where: { id }, include: { prices: true, planAddons: { include: { addon: true } } } });
    if (!plan) throw new NotFoundException('Plan no encontrado.');
    return plan;
  }

  async create(dto: CreatePlanDto) {
    const key = dto.key.trim().toLowerCase();
    const exists = await this.prisma.plan.findUnique({ where: { key } });
    if (exists) throw new ConflictException('La clave del plan ya existe.');
    return this.prisma.plan.create({
      data: {
        key, name: dto.name.trim(), description: dto.description?.trim(),
        includedFeatures: (dto.includedFeatures ?? []).map((item) => item.trim().toLowerCase()),
        isActive: dto.isActive ?? true,
        prices: dto.prices ? { create: dto.prices.map((price) => ({ currency: price.currency.toUpperCase(), amountCents: price.amountCents, interval: price.interval as any, limits: price.limits as any })) } : undefined,
      }, include: { prices: true },
    });
  }

  async update(id: string, dto: Partial<CreatePlanDto>) {
    await this.findOne(id);
    return this.prisma.plan.update({ where: { id }, data: {
      key: dto.key?.trim().toLowerCase(), name: dto.name?.trim(), description: dto.description?.trim(),
      includedFeatures: dto.includedFeatures?.map((item) => item.trim().toLowerCase()), isActive: dto.isActive,
    }, include: { prices: true } });
  }

  async assignTenant(tenantId: string, dto: AssignPlanDto) {
    const plan = await this.findOne(dto.planId);
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant no encontrado.');
    const subscription = await this.prisma.subscription.findFirst({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
    const result = subscription
      ? await this.prisma.subscription.update({ where: { id: subscription.id }, data: { planId: plan.id, status: (dto.status ?? 'active') as any } })
      : await this.prisma.subscription.create({ data: { tenantId, planId: plan.id, status: (dto.status ?? 'active') as any } });
    await this.prisma.$transaction(plan.includedFeatures.map((featureKey) => this.prisma.tenantFeature.upsert({
      where: { tenantId_featureKey: { tenantId, featureKey } }, update: { isEnabled: true }, create: { tenantId, featureKey, isEnabled: true },
    })));
    return result;
  }
}
