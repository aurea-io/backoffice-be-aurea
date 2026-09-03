import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { TenantRepository, UserRepository } from '../../repositories/index.js';
import type { UpdateTenantSettingsDto } from './dto/update-settings.dto.js';
import type { UpdateMemberDto } from './dto/update-member.dto.js';
import { validateBranding } from '../../branding/branding.validator.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type {
  NavigationResponseDto,
  NavigationSectionDto,
  NavigationPageDto,
  NavigationModuleDto,
} from './dto/navigation.dto.js';
import type { TenantContext } from '../../core/interfaces/context.interface.js';

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
      tenantId: tenant.id,
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

    const branding = dto.settings ? ((dto.settings as any).branding ?? dto.settings) : undefined;
    if (branding) {
      try {
        validateBranding({
          primaryColor: branding.primaryColor ?? branding.brandColor,
          accentColor: branding.accentColor,
          textColor: branding.textColor,
          fontFamily: branding.fontFamily,
          logoUrl: branding.logoUrl,
          coverUrl: branding.coverUrl,
        });
      } catch (error) {
        throw new BadRequestException(error instanceof Error ? error.message : 'Branding inválido.');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          name: dto.name ? dto.name.trim() : undefined,
          settings: updatedSettings,
        },
        include: { features: true },
      });

      if (branding) {
        const latest = await tx.tenantBrandingVersion.findFirst({ where: { tenantId }, orderBy: { version: 'desc' } });
        await tx.tenantBrandingVersion.updateMany({ where: { tenantId, isPublished: true }, data: { isPublished: false } });
        await tx.tenantBrandingVersion.create({
          data: {
            tenantId,
            version: (latest?.version ?? 0) + 1,
            primaryColor: branding.primaryColor ?? branding.brandColor ?? '#7c3aed',
            accentColor: branding.accentColor ?? '#a78bfa',
            textColor: branding.textColor ?? '#18181b',
            fontFamily: branding.fontFamily ?? 'sans',
            logoUrl: branding.logoUrl ?? null,
            coverUrl: branding.coverUrl ?? null,
            layoutTokens: branding.layoutTokens ?? null,
            overrides: branding.overrides ?? null,
            isPublished: true,
          },
        });
      }
      return {
        tenantId: updated.id,
        id: updated.id,
        slug: updated.slug,
        name: updated.name,
        vertical: updated.vertical,
        settings: updated.settings ?? {},
        activeFeatures: updated.features
          .filter((f) => f.isEnabled)
          .map((f) => f.featureKey),
      };
    });
  }

  async getBrandingVersions(tenantId: string) {
    return this.prisma.tenantBrandingVersion.findMany({ where: { tenantId }, orderBy: { version: 'desc' }, take: 4 });
  }

  async rollbackBranding(tenantId: string, version: number) {
    if (!Number.isInteger(version) || version < 1) throw new BadRequestException('Versión de branding inválida.');
    const target = await this.prisma.tenantBrandingVersion.findFirst({ where: { tenantId, version } });
    if (!target) throw new NotFoundException('Versión de branding no encontrada.');
    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      if (!tenant) throw new NotFoundException('Tenant no encontrado.');
      const currentSettings = (tenant.settings as Record<string, any>) ?? {};
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          settings: {
            ...currentSettings,
            branding: {
              ...(currentSettings.branding ?? {}),
              primaryColor: target.primaryColor,
              accentColor: target.accentColor,
              textColor: target.textColor,
              fontFamily: target.fontFamily,
              logoUrl: target.logoUrl,
              coverUrl: target.coverUrl,
              layoutTokens: target.layoutTokens ?? undefined,
              overrides: target.overrides ?? undefined,
            },
          },
        },
      });
      await tx.tenantBrandingVersion.updateMany({ where: { tenantId, isPublished: true }, data: { isPublished: false } });
      const latest = await tx.tenantBrandingVersion.findFirst({ where: { tenantId }, orderBy: { version: 'desc' } });
      return tx.tenantBrandingVersion.create({
        data: {
          tenantId,
          version: (latest?.version ?? 0) + 1,
          primaryColor: target.primaryColor,
          accentColor: target.accentColor,
          textColor: target.textColor,
          fontFamily: target.fontFamily,
          logoUrl: target.logoUrl,
          coverUrl: target.coverUrl,
          layoutTokens: target.layoutTokens ?? null,
          overrides: target.overrides ?? null,
          isPublished: true,
        },
      });
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
    const daily: Record<string, { orders: number; revenueCents: number }> = {};
    const hourly: Record<string, number> = {};
    orderDetails.forEach((order) => { channels[order.channel] = (channels[order.channel] || 0) + 1; const day = order.createdAt.toISOString().slice(0, 10); const hour = String(order.createdAt.getUTCHours()).padStart(2, '0'); daily[day] ||= { orders: 0, revenueCents: 0 }; daily[day].orders += 1; hourly[hour] = (hourly[hour] || 0) + 1; order.lines.forEach((line) => { const quantity = line.quantity; const revenue = quantity * line.unitPriceCents; revenueCents += revenue; daily[day].revenueCents += revenue; const title = line.catalogItem?.title || 'Ítem'; const current = products.get(title) || { title, quantity: 0, revenueCents: 0 }; current.quantity += quantity; current.revenueCents += revenue; products.set(title, current); }); });
    return { members, bookings, orders, inventoryItems: inventory._count.id, inventoryUnits: inventory._sum.quantity ?? 0, activeFeatures, revenueCents, averageTicketCents: orderDetails.length ? Math.round(revenueCents / orderDetails.length) : 0, ordersByChannel: channels, topProducts: [...products.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5), bookingsByStatus: bookingStatuses.map((entry) => ({ status: entry.status, count: entry._count._all })), dailySeries: Object.entries(daily).sort(([a], [b]) => a.localeCompare(b)).map(([date, value]) => ({ date, ...value })), ordersByHour: Object.entries(hourly).sort(([a], [b]) => a.localeCompare(b)).map(([hour, count]) => ({ hour, count })) };
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

  async getNavigation(tenant: TenantContext): Promise<NavigationResponseDto> {
    const userRole = tenant.role;
    const userPermissions = tenant.permissions ?? [];
    const activeFeatures = new Set(tenant.activeFeatures ?? []);

    const isOwner = userRole === Role.OWNER;
    const hasWildcard = userPermissions.includes('*') || userPermissions.includes('all');
    const isUnrestricted = isOwner || hasWildcard;

    // 1. Consultar exclusivamente la Base de Datos (ModuleCatalogEntry)
    const entries = await this.prisma.moduleCatalogEntry.findMany({
      where: {
        status: 'active',
        isArchived: false,
      },
      orderBy: [
        { sectionKey: 'asc' },
        { pageKey: 'asc' },
        { kind: 'asc' },
        { key: 'asc' },
      ],
    });

    if (!entries || entries.length === 0) {
      return { sections: [] };
    }

    // Estructuras intermedias para agrupar módulos y páginas desde la BD
    const sectionNames: Record<string, string> = {
      core: 'Principal',
      services: 'Servicios',
      commerce: 'Comercio',
      gastronomy: 'Gastronomía',
      crm: 'Gestión de Clientes',
      marketing: 'Marketing & Lealtad',
    };
    const sectionLabels = new Map<string, string>();

    interface PageAccumulator {
      id: string;
      name: string;
      path: string;
      feature?: string;
      permissions: string[];
      modules: NavigationModuleDto[];
    }

    const sectionsMap = new Map<string, Map<string, PageAccumulator>>();

    // 2. Procesar entradas de la Base de Datos garantizando que la entrada 'module' sea la autoridad
    // Primero, inicializar las páginas con sus módulos raíz
    for (const entry of entries) {
      const { sectionKey, pageKey, moduleKey, label, kind, permissions, metadata } = entry;
      const meta = (metadata as Record<string, any>) ?? {};

      if (meta.sectionName && !sectionLabels.has(sectionKey)) {
        sectionLabels.set(sectionKey, meta.sectionName);
      }

      if (!sectionsMap.has(sectionKey)) {
        sectionsMap.set(sectionKey, new Map<string, PageAccumulator>());
      }
      const pagesMap = sectionsMap.get(sectionKey)!;

      if (kind === 'module') {
        const featureKey = meta.feature ?? (
          sectionKey === 'core'
            ? undefined
            : pageKey === 'table-bookings'
              ? 'tables'
              : pageKey === 'pos'
                ? 'pos_cashier'
                : pageKey === 'coupons' || pageKey === 'loyalty'
                  ? 'marketing'
                  : pageKey
        );

        const pagePath = meta.path ?? `/${sectionKey}/${pageKey}`;

        const existingPage = pagesMap.get(pageKey);
        pagesMap.set(pageKey, {
          id: pageKey,
          name: meta.pageName ?? label,
          path: pagePath,
          feature: featureKey,
          permissions: permissions ?? [],
          modules: existingPage ? existingPage.modules : [],
        });
      }
    }

    // Luego, agregar las funciones hijas evaluando los permisos RBAC de cada módulo hijo
    for (const entry of entries) {
      const { sectionKey, pageKey, moduleKey, label, kind, permissions } = entry;

      if (kind === 'function' || (kind === 'module' && moduleKey && moduleKey !== pageKey)) {
        const pagesMap = sectionsMap.get(sectionKey);
        if (!pagesMap) continue;

        let pageAcc = pagesMap.get(pageKey);
        if (!pageAcc) {
          // Si no había entrada raíz 'module', inicializar con valores por defecto
          pageAcc = {
            id: pageKey,
            name: label,
            path: `/${sectionKey}/${pageKey}`,
            permissions: [],
            modules: [],
          };
          pagesMap.set(pageKey, pageAcc);
        }

        // Filtro RBAC para el módulo/función hijo
        if (permissions && permissions.length > 0 && !isUnrestricted) {
          const hasChildPerm = permissions.some((p) => userPermissions.includes(p));
          if (!hasChildPerm) {
            continue; // Submódulo no permitido para este colaborador -> omitir
          }
        }

        pageAcc.modules.push({
          key: moduleKey || entry.key,
          name: label,
        });
      }
    }

    // 3. Filtrado Estricto de Seguridad en Servidor (Entitlements de Tenant + RBAC)
    const filteredSections: NavigationSectionDto[] = [];

    for (const [sectionKey, pagesMap] of sectionsMap.entries()) {
      const visiblePages: NavigationPageDto[] = [];

      for (const page of pagesMap.values()) {
        // Regla A: Si requiere una feature comercial del tenant y no está activa -> OMITIR
        if (page.feature && !activeFeatures.has(page.feature)) {
          continue;
        }

        // Regla B: Si requiere permisos y el colaborador no es OWNER ni tiene wildcard -> OMITIR
        if (page.permissions.length > 0 && !isUnrestricted) {
          const hasAnyPerm = page.permissions.some((p) => userPermissions.includes(p));
          if (!hasAnyPerm) {
            continue;
          }
        }

        visiblePages.push({
          id: page.id,
          name: page.name,
          path: page.path,
          feature: page.feature,
          modules: page.modules,
        });
      }

      // Regla C: Podado (Pruning) de secciones vacías
      if (visiblePages.length > 0) {
        filteredSections.push({
          id: sectionKey,
          name: sectionLabels.get(sectionKey) ?? sectionNames[sectionKey] ?? sectionKey.toUpperCase(),
          pages: visiblePages,
        });
      }
    }

    return { sections: filteredSections };
  }
}

