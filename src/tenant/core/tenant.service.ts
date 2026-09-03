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

    // Asegurar que la colección ModuleCatalogEntry en MongoDB posea los registros canónicos iniciales si está vacía
    await this.ensureCatalogSeeded();

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

        const pagePath = meta.path ?? (
          pageKey === 'dashboard'
            ? '/dashboard'
            : pageKey === 'theme'
              ? '/settings'
              : pageKey === 'billing'
                ? '/settings/billing'
                : pageKey === 'members'
                  ? '/members'
                  : pageKey === 'bookings'
                    ? '/appointments'
                    : pageKey === 'tables'
                      ? '/restaurant'
                      : `/${pageKey}`
        );

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
            path: `/${pageKey}`,
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
          name: sectionNames[sectionKey] ?? sectionKey.toUpperCase(),
          pages: visiblePages,
        });
      }
    }

    return { sections: filteredSections };
  }

  private async ensureCatalogSeeded(): Promise<void> {
    try {
      const existing = await this.prisma.moduleCatalogEntry.findMany({
        select: { key: true },
      });
      const existingKeys = new Set(existing.map((e) => e.key));

      const canonicalCatalog = [
        // Core
        { key: 'core.dashboard', kind: 'module', sectionKey: 'core', pageKey: 'dashboard', moduleKey: 'dashboard', label: 'Resumen', permissions: [] },
        { key: 'core.dashboard.kpis', kind: 'function', sectionKey: 'core', pageKey: 'dashboard', moduleKey: 'kpis', label: 'KPIs & Métricas', permissions: [] },
        { key: 'core.dashboard.recent_activity', kind: 'function', sectionKey: 'core', pageKey: 'dashboard', moduleKey: 'recent_activity', label: 'Actividad Reciente', permissions: [] },
        { key: 'core.dashboard.alerts', kind: 'function', sectionKey: 'core', pageKey: 'dashboard', moduleKey: 'alerts', label: 'Alertas del Sistema', permissions: [] },
        { key: 'core.members', kind: 'module', sectionKey: 'core', pageKey: 'members', moduleKey: 'members', label: 'Equipo', permissions: ['tenant:employees:read'] },
        { key: 'core.members.invitations', kind: 'function', sectionKey: 'core', pageKey: 'members', moduleKey: 'invitations', label: 'Invitaciones', permissions: ['tenant:employees:read'] },
        { key: 'core.members.role_assignment', kind: 'function', sectionKey: 'core', pageKey: 'members', moduleKey: 'role_assignment', label: 'Roles & Permisos', permissions: ['tenant:employees:manage'] },
        { key: 'core.theme', kind: 'module', sectionKey: 'core', pageKey: 'theme', moduleKey: 'theme', label: 'Configuración', permissions: [] },
        { key: 'core.theme.branding', kind: 'function', sectionKey: 'core', pageKey: 'theme', moduleKey: 'branding', label: 'Identidad & Colores', permissions: [] },
        { key: 'core.theme.css_customization', kind: 'function', sectionKey: 'core', pageKey: 'theme', moduleKey: 'css_customization', label: 'Personalización Visual', permissions: [] },
        { key: 'core.billing', kind: 'module', sectionKey: 'core', pageKey: 'billing', moduleKey: 'billing', label: 'Plan y Facturación', permissions: [] },
        { key: 'core.billing.plan_details', kind: 'function', sectionKey: 'core', pageKey: 'billing', moduleKey: 'plan_details', label: 'Detalles del Plan', permissions: [] },
        { key: 'core.billing.credits_usage', kind: 'function', sectionKey: 'core', pageKey: 'billing', moduleKey: 'credits_usage', label: 'Consumo de Créditos', permissions: [] },
        { key: 'core.billing.addons', kind: 'function', sectionKey: 'core', pageKey: 'billing', moduleKey: 'addons', label: 'Módulos y Addons', permissions: [] },

        // Services
        { key: 'services.bookings', kind: 'module', sectionKey: 'services', pageKey: 'bookings', moduleKey: 'bookings', label: 'Agenda de Turnos', permissions: ['appointments:read', 'bookings.view'] },
        { key: 'services.bookings.create', kind: 'function', sectionKey: 'services', pageKey: 'bookings', moduleKey: 'create', label: 'Crear Turnos', permissions: ['appointments:write'] },
        { key: 'services.bookings.reschedule', kind: 'function', sectionKey: 'services', pageKey: 'bookings', moduleKey: 'reschedule', label: 'Reprogramar', permissions: ['appointments:write'] },
        { key: 'services.bookings.photo_upload', kind: 'function', sectionKey: 'services', pageKey: 'bookings', moduleKey: 'photo_upload', label: 'Fotos de Referencia', permissions: [] },
        { key: 'services.bookings.staff_assignment', kind: 'function', sectionKey: 'services', pageKey: 'bookings', moduleKey: 'staff_assignment', label: 'Asignar Profesional', permissions: [] },
        { key: 'services.bookings.notifications', kind: 'function', sectionKey: 'services', pageKey: 'bookings', moduleKey: 'notifications', label: 'Recordatorios', permissions: [] },

        // Commerce
        { key: 'commerce.catalog', kind: 'module', sectionKey: 'commerce', pageKey: 'catalog', moduleKey: 'catalog', label: 'Catálogo', permissions: ['catalog:read', 'catalog.view', 'catalog:write'] },
        { key: 'commerce.catalog.items', kind: 'function', sectionKey: 'commerce', pageKey: 'catalog', moduleKey: 'items', label: 'Gestión de Ítems', permissions: ['catalog:read'] },
        { key: 'commerce.catalog.add_to_cart', kind: 'function', sectionKey: 'commerce', pageKey: 'catalog', moduleKey: 'add_to_cart', label: 'Agregar al Carrito', permissions: [] },
        { key: 'commerce.catalog.variants', kind: 'function', sectionKey: 'commerce', pageKey: 'catalog', moduleKey: 'variants', label: 'Modificadores y Variantes', permissions: [] },
        { key: 'commerce.catalog.images', kind: 'function', sectionKey: 'commerce', pageKey: 'catalog', moduleKey: 'images', label: 'Galería de Fotos', permissions: [] },
        { key: 'commerce.catalog.stock_badge', kind: 'function', sectionKey: 'commerce', pageKey: 'catalog', moduleKey: 'stock_badge', label: 'Insignia de Stock', permissions: [] },
        { key: 'commerce.inventory', kind: 'module', sectionKey: 'commerce', pageKey: 'inventory', moduleKey: 'inventory', label: 'Inventario', permissions: ['inventory:read', 'inventory.manage'] },
        { key: 'commerce.inventory.minimum_alerts', kind: 'function', sectionKey: 'commerce', pageKey: 'inventory', moduleKey: 'minimum_alerts', label: 'Alertas de Stock Mínimo', permissions: ['inventory:read'] },
        { key: 'commerce.inventory.manual_adjust', kind: 'function', sectionKey: 'commerce', pageKey: 'inventory', moduleKey: 'manual_adjust', label: 'Ajuste Manual', permissions: ['inventory:manage'] },
        { key: 'commerce.inventory.movements_history', kind: 'function', sectionKey: 'commerce', pageKey: 'inventory', moduleKey: 'movements_history', label: 'Historial de Movimientos', permissions: ['inventory:read'] },
        { key: 'commerce.pos', kind: 'module', sectionKey: 'commerce', pageKey: 'pos', moduleKey: 'pos', label: 'Caja & Cobros', permissions: ['pos.cashier', 'pos:read'] },
        { key: 'commerce.pos.shifts', kind: 'function', sectionKey: 'commerce', pageKey: 'pos', moduleKey: 'shifts', label: 'Turnos de Caja', permissions: ['pos.cashier'] },
        { key: 'commerce.pos.blind_closing', kind: 'function', sectionKey: 'commerce', pageKey: 'pos', moduleKey: 'blind_closing', label: 'Arqueo Ciego', permissions: ['pos.cashier'] },
        { key: 'commerce.pos.multi_tender', kind: 'function', sectionKey: 'commerce', pageKey: 'pos', moduleKey: 'multi_tender', label: 'Múltiples Medios de Pago', permissions: ['pos.cashier'] },

        // Gastronomy
        { key: 'gastronomy.tables', kind: 'module', sectionKey: 'gastronomy', pageKey: 'tables', moduleKey: 'tables', label: 'Salón y Mesas', permissions: ['tables.view', 'tables:read', 'orders:create'] },
        { key: 'gastronomy.tables.status', kind: 'function', sectionKey: 'gastronomy', pageKey: 'tables', moduleKey: 'status', label: 'Estado de Mesas', permissions: ['tables.view'] },
        { key: 'gastronomy.tables.qr_generator', kind: 'function', sectionKey: 'gastronomy', pageKey: 'tables', moduleKey: 'qr_generator', label: 'Generador de QR', permissions: [] },
        { key: 'gastronomy.tables.bookings', kind: 'function', sectionKey: 'gastronomy', pageKey: 'tables', moduleKey: 'bookings', label: 'Comandas de Mesa', permissions: [] },
        { key: 'gastronomy.table-bookings', kind: 'module', sectionKey: 'gastronomy', pageKey: 'table-bookings', moduleKey: 'table-bookings', label: 'Reservas de Salón', permissions: ['tables.view', 'bookings.view'] },
        { key: 'gastronomy.table-bookings.qr_view', kind: 'function', sectionKey: 'gastronomy', pageKey: 'table-bookings', moduleKey: 'qr_view', label: 'Reserva Online', permissions: [] },
        { key: 'gastronomy.table-bookings.table_request', kind: 'function', sectionKey: 'gastronomy', pageKey: 'table-bookings', moduleKey: 'table_request', label: 'Asignación de Comensales', permissions: [] },
        { key: 'gastronomy.kitchen', kind: 'module', sectionKey: 'gastronomy', pageKey: 'kitchen', moduleKey: 'kitchen', label: 'Cocina / KDS', permissions: ['kitchen.view', 'kitchen:read'] },
        { key: 'gastronomy.kitchen.timer', kind: 'function', sectionKey: 'gastronomy', pageKey: 'kitchen', moduleKey: 'timer', label: 'Cronómetro de Espera', permissions: [] },
        { key: 'gastronomy.kitchen.stage_progression', kind: 'function', sectionKey: 'gastronomy', pageKey: 'kitchen', moduleKey: 'stage_progression', label: 'Avance de Platos', permissions: [] },

        // CRM
        { key: 'crm.clients', kind: 'module', sectionKey: 'crm', pageKey: 'clients', moduleKey: 'clients', label: 'Clientes', permissions: ['clients:read', 'clients.view'] },
        { key: 'crm.clients.profile', kind: 'function', sectionKey: 'crm', pageKey: 'clients', moduleKey: 'profile', label: 'Ficha del Cliente', permissions: [] },
        { key: 'crm.clients.history', kind: 'function', sectionKey: 'crm', pageKey: 'clients', moduleKey: 'history', label: 'Historial de Visitas', permissions: [] },
        { key: 'crm.clients.preferences', kind: 'function', sectionKey: 'crm', pageKey: 'clients', moduleKey: 'preferences', label: 'Preferencias', permissions: [] },

        // Marketing
        { key: 'marketing.coupons', kind: 'module', sectionKey: 'marketing', pageKey: 'coupons', moduleKey: 'coupons', label: 'Cupones', permissions: ['marketing:read'] },
        { key: 'marketing.coupons.usage_limit', kind: 'function', sectionKey: 'marketing', pageKey: 'coupons', moduleKey: 'usage_limit', label: 'Límite de Uso', permissions: [] },
        { key: 'marketing.coupons.min_purchase', kind: 'function', sectionKey: 'marketing', pageKey: 'coupons', moduleKey: 'min_purchase', label: 'Compra Mínima', permissions: [] },
        { key: 'marketing.loyalty', kind: 'module', sectionKey: 'marketing', pageKey: 'loyalty', moduleKey: 'loyalty', label: 'Fidelización', permissions: ['marketing:read'] },
        { key: 'marketing.loyalty.earn_rules', kind: 'function', sectionKey: 'marketing', pageKey: 'loyalty', moduleKey: 'earn_rules', label: 'Reglas de Acumulación', permissions: [] },
        { key: 'marketing.loyalty.rewards', kind: 'function', sectionKey: 'marketing', pageKey: 'loyalty', moduleKey: 'rewards', label: 'Catálogo de Premios', permissions: [] },
      ];

      for (const item of canonicalCatalog) {
        if (existingKeys.has(item.key)) continue;

        await this.prisma.moduleCatalogEntry.upsert({
          where: { key: item.key },
          update: {},
          create: {
            key: item.key,
            kind: item.kind,
            sectionKey: item.sectionKey,
            pageKey: item.pageKey,
            moduleKey: item.moduleKey,
            label: item.label,
            scope: 'tenant',
            status: 'active',
            isArchived: false,
            permissions: item.permissions,
            dependencies: [],
            compatibility: { minVersion: '1.0.0' },
            catalogVersion: '1.0.0',
          },
        });
      }
    } catch {
      // Ignorar errores de siembra en caso de restricciones de acceso temporal
    }
  }
}

