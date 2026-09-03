import { PrismaClient, Role, SubscriptionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {}
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed para Aurea Backoffice...');

  for (const role of [
    { key: 'tenant_owner', scope: 'tenant', permissions: ['*'] },
    { key: 'tenant_manager', scope: 'tenant', permissions: ['tenant:employees:read', 'tenant:employees:manage'] },
    { key: 'tenant_staff', scope: 'tenant', permissions: ['tenant:employees:read'] },
    { key: 'tenant_cashier', scope: 'tenant', permissions: ['tenant:orders:read', 'tenant:orders:manage'] },
    { key: 'platform_owner', scope: 'platform', permissions: ['*'] },
    { key: 'platform_readonly', scope: 'platform', permissions: ['platform:read'] },
  ]) {
    await prisma.roleDefinition.upsert({ where: { key: role.key }, update: role, create: role });
  }

  const plan = await prisma.plan.upsert({
    where: { key: 'demo-backoffice' },
    update: { name: 'Demo Backoffice', isActive: true },
    create: { key: 'demo-backoffice', name: 'Demo Backoffice', description: 'Plan inicial para el entorno demo', isActive: true },
  });

  const email = process.env.AUREA_ADMIN_EMAIL;
  const password = process.env.AUREA_ADMIN_PASSWORD;
  const name = process.env.AUREA_ADMIN_NAME || 'Superadmin Aurea';
  if (!email || !password) {
    throw new Error('AUREA_ADMIN_EMAIL and AUREA_ADMIN_PASSWORD are required for the seed.');
  }

  const saltRounds = 10;

  const passwordHash = await bcrypt.hash(password, saltRounds);

  // 1. Find or Create Superadmin User
  let adminUser = await prisma.user.findUnique({ where: { email } });
  if (adminUser) {
    adminUser = await prisma.user.update({
      where: { email },
      data: { name, passwordHash, active: true },
    });
  } else {
    adminUser = await prisma.user.create({
      data: { email, name, passwordHash, active: true },
    });
  }

  console.log(`✅ Usuario Superadmin creado/actualizado: ${adminUser.email} (ID: ${adminUser.id})`);

  // 2. Find or Create System Tenant
  let systemTenant = await prisma.tenant.findUnique({ where: { slug: 'aurea-platform' } });
  if (systemTenant) {
    systemTenant = await prisma.tenant.update({
      where: { slug: 'aurea-platform' },
      data: { name: 'Aurea Platform System', vertical: 'system', isActive: true },
    });
  } else {
    systemTenant = await prisma.tenant.create({
      data: {
        slug: 'aurea-platform',
        name: 'Aurea Platform System',
        vertical: 'system',
        isActive: true,
        settings: {
          branding: {
            primaryColor: '#7c3aed',
            tagline: 'Plataforma Central Aurea',
          },
        },
      },
    });
  }

  console.log(`✅ Tenant del Sistema: ${systemTenant.name} (Slug: ${systemTenant.slug})`);

  // 3. Persist platform scope membership (not a tenant role)
  const platformMembership = await prisma.platformMembership.upsert({
    where: { userId_roleKey: { userId: adminUser.id, roleKey: 'SUPERADMIN' } },
    update: { isActive: true },
    create: { userId: adminUser.id, roleKey: 'SUPERADMIN', isActive: true },
  });

  console.log(`✅ Membresía de plataforma asignada: ${platformMembership.roleKey}`);

  // 4. Find or Create Demo Tenant
  let demoTenant = await prisma.tenant.findUnique({ where: { slug: 'de-santas' } });
  if (demoTenant) {
    demoTenant = await prisma.tenant.update({
      where: { slug: 'de-santas' },
      data: { name: 'De Santas Studio', vertical: 'beauty', isActive: true },
    });
  } else {
    demoTenant = await prisma.tenant.create({
      data: {
        slug: 'de-santas',
        name: 'De Santas Studio',
        vertical: 'beauty',
        isActive: true,
        settings: {
          branding: {
            primaryColor: '#7c3aed',
            tagline: 'Estudio de Belleza & Turnos',
          },
          contact: {
            phone: '+54 9 11 2345-6789',
            address: 'Palermo Soho, Buenos Aires',
          },
        },
      },
    });
  }

  const demoSubscription = await prisma.subscription.findFirst({ where: { tenantId: demoTenant.id } });
  if (demoSubscription) {
    await prisma.subscription.update({ where: { id: demoSubscription.id }, data: { planId: plan.id, status: SubscriptionStatus.active } });
  } else {
    await prisma.subscription.create({ data: { tenantId: demoTenant.id, planId: plan.id, status: SubscriptionStatus.active } });
  }

  // Assign admin as OWNER of demo tenant
  const existingOwnerMembership = await prisma.tenantUser.findUnique({
    where: {
      tenantId_userId: {
        tenantId: demoTenant.id,
        userId: adminUser.id,
      },
    },
  });

  if (existingOwnerMembership) {
    await prisma.tenantUser.update({
      where: { id: existingOwnerMembership.id },
      data: { role: Role.OWNER, roleKey: 'tenant_owner', permissions: ['*'], isActive: true },
    });
  } else {
    await prisma.tenantUser.create({
      data: {
        tenantId: demoTenant.id,
        userId: adminUser.id,
        role: Role.OWNER,
        roleKey: 'tenant_owner',
        permissions: ['*'],
        isActive: true,
      },
    });
  }

  // Assign default features to demo tenant
  const defaultFeatures = ['catalog', 'bookings', 'social_hub'];
  for (const featureKey of defaultFeatures) {
    const existingFeature = await prisma.tenantFeature.findUnique({
      where: {
        tenantId_featureKey: {
          tenantId: demoTenant.id,
          featureKey,
        },
      },
    });

    if (existingFeature) {
      await prisma.tenantFeature.update({
        where: { id: existingFeature.id },
        data: { isEnabled: true },
      });
    } else {
      await prisma.tenantFeature.create({
        data: {
          tenantId: demoTenant.id,
          featureKey,
          isEnabled: true,
        },
      });
    }
  }

  console.log(`✅ Demo Tenant creado: ${demoTenant.name} con features: ${defaultFeatures.join(', ')}`);

  // 3. Seed Canonical Module Catalog Entries (Taxonomía en BD)
  console.log('📦 Sincronizando catálogo canónico de módulos en Base de Datos...');
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
    await prisma.moduleCatalogEntry.upsert({
      where: { key: item.key },
      update: {
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
  console.log(`✅ ${canonicalCatalog.length} entradas de taxonomía sincronizadas en Base de Datos.`);

  console.log('\n=========================================');
  console.log('🎉 Seed completado exitosamente!');
  console.log('Credenciales de acceso:');
  console.log(`📧 Email:    ${email}`);
  console.log('🔑 Password: provista mediante AUREA_ADMIN_PASSWORD');
  console.log('=========================================\n');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
