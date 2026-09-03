import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TenantService } from './tenant.service.js';
import { Role } from '@prisma/client';
import type { TenantContext } from '../../core/interfaces/context.interface.js';

describe('TenantService.getNavigation (Database-driven & strictly filtered)', () => {
  let tenantService: TenantService;
  let mockPrisma: any;
  let mockTenantRepo: any;
  let mockUserRepo: any;

  const mockDbCatalog = [
    // Core
    { key: 'core.dashboard', kind: 'module', sectionKey: 'core', pageKey: 'dashboard', moduleKey: 'dashboard', label: 'Resumen', permissions: [] },
    { key: 'core.dashboard.kpis', kind: 'function', sectionKey: 'core', pageKey: 'dashboard', moduleKey: 'kpis', label: 'KPIs & Métricas', permissions: [] },
    { key: 'core.members', kind: 'module', sectionKey: 'core', pageKey: 'members', moduleKey: 'members', label: 'Equipo', permissions: ['tenant:employees:read'] },
    { key: 'core.theme', kind: 'module', sectionKey: 'core', pageKey: 'theme', moduleKey: 'theme', label: 'Configuración', permissions: [] },
    { key: 'core.billing', kind: 'module', sectionKey: 'core', pageKey: 'billing', moduleKey: 'billing', label: 'Plan y Facturación', permissions: [] },

    // Services
    { key: 'services.bookings', kind: 'module', sectionKey: 'services', pageKey: 'bookings', moduleKey: 'bookings', label: 'Agenda de Turnos', permissions: ['appointments:read', 'bookings.view'] },
    { key: 'services.bookings.create', kind: 'function', sectionKey: 'services', pageKey: 'bookings', moduleKey: 'create', label: 'Crear Turnos', permissions: [] },

    // Commerce
    { key: 'commerce.catalog', kind: 'module', sectionKey: 'commerce', pageKey: 'catalog', moduleKey: 'catalog', label: 'Catálogo', permissions: ['catalog:read'] },
    { key: 'commerce.catalog.items', kind: 'function', sectionKey: 'commerce', pageKey: 'catalog', moduleKey: 'items', label: 'Gestión de Ítems', permissions: [] },
    { key: 'commerce.inventory', kind: 'module', sectionKey: 'commerce', pageKey: 'inventory', moduleKey: 'inventory', label: 'Inventario', permissions: ['inventory:read'] },
    { key: 'commerce.pos', kind: 'module', sectionKey: 'commerce', pageKey: 'pos', moduleKey: 'pos', label: 'Caja & Cobros', permissions: ['pos:read'] },

    // Gastronomy
    { key: 'gastronomy.tables', kind: 'module', sectionKey: 'gastronomy', pageKey: 'tables', moduleKey: 'tables', label: 'Salón y Mesas', permissions: ['tables.view'] },
    { key: 'gastronomy.table-bookings', kind: 'module', sectionKey: 'gastronomy', pageKey: 'table-bookings', moduleKey: 'table-bookings', label: 'Reservas de Salón', permissions: ['tables.view'] },
    { key: 'gastronomy.kitchen', kind: 'module', sectionKey: 'gastronomy', pageKey: 'kitchen', moduleKey: 'kitchen', label: 'Cocina / KDS', permissions: ['kitchen.view'] },

    // CRM
    { key: 'crm.clients', kind: 'module', sectionKey: 'crm', pageKey: 'clients', moduleKey: 'clients', label: 'Clientes', permissions: ['clients:read'] },
  ];

  beforeEach(() => {
    mockPrisma = {
      moduleCatalogEntry: {
        findMany: vi.fn(),
      },
    };
    mockTenantRepo = {};
    mockUserRepo = {};
    tenantService = new TenantService(mockTenantRepo, mockUserRepo, mockPrisma);
  });

  it('returns empty sections if database has no catalog entries (no hardcoded fallback)', async () => {
    mockPrisma.moduleCatalogEntry.findMany.mockResolvedValue([]);

    const tenantContext: TenantContext = {
      tenantId: 'tenant-123',
      slug: 'test-tenant',
      name: 'Test Tenant',
      vertical: 'beauty',
      role: Role.OWNER,
      permissions: ['*'],
      activeFeatures: ['catalog', 'bookings'],
    };

    const res = await tenantService.getNavigation(tenantContext);
    expect(res.sections).toEqual([]);
    expect(mockPrisma.moduleCatalogEntry.findMany).toHaveBeenCalledTimes(1);
  });

  it('filters out gastronomy and unenabled features for beauty salon (De Santas Studio)', async () => {
    mockPrisma.moduleCatalogEntry.findMany.mockResolvedValue(mockDbCatalog);

    const beautyTenantContext: TenantContext = {
      tenantId: 'de-santas',
      slug: 'de-santas',
      name: 'De Santas Studio',
      vertical: 'beauty',
      role: Role.OWNER,
      permissions: ['*'],
      activeFeatures: ['catalog', 'bookings', 'social_hub'],
    };

    const res = await tenantService.getNavigation(beautyTenantContext);

    const sectionIds = res.sections.map((s) => s.id);
    expect(sectionIds).toContain('core');
    expect(sectionIds).toContain('services');
    expect(sectionIds).toContain('commerce');

    // NUNCA debe contener gastronomía ni CRM porque el comercio no las tiene activas
    expect(sectionIds).not.toContain('gastronomy');
    expect(sectionIds).not.toContain('crm');

    // En commerce solo debe estar catalog (no inventory ni pos)
    const commerceSection = res.sections.find((s) => s.id === 'commerce')!;
    const commercePages = commerceSection.pages.map((p) => p.id);
    expect(commercePages).toEqual(['catalog']);
    expect(commercePages).not.toContain('inventory');
    expect(commercePages).not.toContain('pos');

    // En services debe estar bookings y sus módulos
    const servicesSection = res.sections.find((s) => s.id === 'services')!;
    expect(servicesSection.pages[0].id).toBe('bookings');
    expect(servicesSection.pages[0].modules).toEqual([
      { key: 'create', name: 'Crear Turnos' },
    ]);
  });

  it('filters pages based on user permissions for staff without employees:read', async () => {
    mockPrisma.moduleCatalogEntry.findMany.mockResolvedValue(mockDbCatalog);

    const staffContext: TenantContext = {
      tenantId: 'de-santas',
      slug: 'de-santas',
      name: 'De Santas Studio',
      vertical: 'beauty',
      role: Role.STAFF,
      permissions: ['appointments:read', 'bookings.view'],
      activeFeatures: ['catalog', 'bookings'],
    };

    const res = await tenantService.getNavigation(staffContext);

    const coreSection = res.sections.find((s) => s.id === 'core')!;
    const corePages = coreSection.pages.map((p) => p.id);
    expect(corePages).not.toContain('members'); // Staff no tiene tenant:employees:read
    expect(corePages).toContain('dashboard');
  });
});
