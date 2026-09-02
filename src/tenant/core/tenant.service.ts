import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantRepository, UserRepository } from '../../repositories/index.js';
import type { UpdateTenantSettingsDto } from './dto/update-settings.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';
import { validateBranding } from '../../branding/branding.validator.js';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly userRepo: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getTenantContext(tenantId: string) {
    const tenant = await this.tenantRepo.findById(tenantId);

    if (!tenant || !tenant.isActive) {
      throw new NotFoundException('Tenant not found or inactive.');
    }

    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      vertical: tenant.vertical,
      settings: tenant.settings ?? {},
      activeFeatures: tenant.features
        .filter((f) => f.isEnabled)
        .map((f) => f.featureKey),
    };
  }

  async updateSettings(tenantId: string, dto: UpdateTenantSettingsDto) {
    const tenant = await this.tenantRepo.findById(tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found.');
    }

    const currentSettings = (tenant.settings as Record<string, any>) ?? {};
    const updatedSettings = dto.settings
      ? { ...currentSettings, ...dto.settings }
      : currentSettings;

    if (dto.settings) {
      try {
        validateBranding({
          primaryColor: dto.settings.primaryColor ?? dto.settings.brandColor,
          accentColor: dto.settings.accentColor,
          textColor: dto.settings.textColor,
          fontFamily: dto.settings.fontFamily,
          logoUrl: dto.settings.logoUrl,
          coverUrl: dto.settings.coverUrl,
        });
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'Branding inválido.');
      }
    }

    return this.tenantRepo.update(tenantId, {
      name: dto.name ? dto.name.trim() : undefined,
      settings: updatedSettings,
    });
  }

  async getMembers(tenantId: string) {
    return this.tenantRepo.findMembershipsByTenantId(tenantId);
  }

  async getBilling(tenantId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { tenantId }, orderBy: { createdAt: 'desc' },
      include: { plan: { include: { prices: { where: { isActive: true } } } }, addons: { include: { addon: true } } },
    });
    return subscription ?? { status: 'unconfigured', plan: null, addons: [] };
  }

  async getAnalytics(tenantId: string) {
    const [members, bookings, orders, inventory, activeFeatures, orderDetails, bookingStatuses] = await Promise.all([
      this.prisma.tenantUser.count({ where: { tenantId, isActive: true } }),
      this.prisma.booking.count({ where: { tenantId, status: { not: 'canceled' } } }),
      this.prisma.order.count({ where: { tenantId, status: { not: 'canceled' } } }),
      this.prisma.inventoryItem.aggregate({ where: { tenantId, isActive: true }, _count: { id: true }, _sum: { quantity: true } }),
      this.prisma.tenantFeature.count({ where: { tenantId, isEnabled: true } }),
      this.prisma.order.findMany({ where: { tenantId, status: { notIn: ['canceled' as any] } }, select: { status: true, channel: true, createdAt: true, lines: { select: { quantity: true, unitPriceCents: true, catalogItem: { select: { title: true } } } } }, orderBy: { createdAt: 'desc' }, take: 5000 }),
      this.prisma.booking.groupBy({ by: ['status'], where: { tenantId } as any, _count: { _all: true } }),
    ]);
    const products = new Map<string, { title: string; quantity: number; revenueCents: number }>();
    let revenueCents = 0;
    const channels: Record<string, number> = {};
    orderDetails.forEach((order) => { channels[order.channel] = (channels[order.channel] || 0) + 1; order.lines.forEach((line) => { const quantity = line.quantity; const revenue = quantity * line.unitPriceCents; revenueCents += revenue; const title = line.catalogItem?.title || 'Ítem'; const current = products.get(title) || { title, quantity: 0, revenueCents: 0 }; current.quantity += quantity; current.revenueCents += revenue; products.set(title, current); }); });
    return { members, bookings, orders, inventoryItems: inventory._count.id, inventoryUnits: inventory._sum.quantity ?? 0, activeFeatures, revenueCents, averageTicketCents: orderDetails.length ? Math.round(revenueCents / orderDetails.length) : 0, ordersByChannel: channels, topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5), bookingsByStatus: bookingStatuses.map((entry) => ({ status: entry.status, count: entry._count._all })) };
  }

  async addMember(tenantId: string, email: string, role: Role = Role.STAFF, permissions?: string[]) {
    const targetEmail = email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(targetEmail);

    if (!user) {
      throw new BadRequestException(
        `User '${targetEmail}' must register on the platform first.`,
      );
    }

    return this.tenantRepo.upsertMembership(tenantId, user.id, role, permissions ?? []);
  }

  async updateMember(tenantId: string, userId: string, dto: UpdateMemberDto) {
    const membership = await this.tenantRepo.findMembership(tenantId, userId);
    if (!membership) throw new NotFoundException('Membresía no encontrada.');
    if (membership.role === Role.OWNER && ((dto.role && dto.role !== Role.OWNER) || dto.isActive === false)) {
      if (await this.tenantRepo.countActiveOwners(tenantId) <= 1) {
        throw new ConflictException('El tenant debe conservar al menos un OWNER activo.');
      }
    }
    return this.tenantRepo.updateMembership(tenantId, userId, {
      role: dto.role,
      roleKey: dto.roleKey?.trim() || undefined,
      permissions: dto.permissions,
      isActive: dto.isActive,
    });
  }

  async removeMember(tenantId: string, userId: string) {
    const membership = await this.tenantRepo.findMembership(tenantId, userId);
    if (!membership) throw new NotFoundException('Membresía no encontrada.');
    if (membership.role === Role.OWNER && await this.tenantRepo.countActiveOwners(tenantId) <= 1) {
      throw new ConflictException('No se puede remover al último OWNER activo.');
    }
    await this.tenantRepo.removeMembership(tenantId, userId);
    return { success: true, message: 'Membresía revocada.' };
  }
}
