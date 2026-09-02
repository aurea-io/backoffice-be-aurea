import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const password = process.env.AUREA_TEST_PASSWORD || 'AureaTest!2026';
const tenantSlug = 'de-santas';

const users = [
  { email: 'qa.superadmin@aurea.test', name: 'QA Superadmin', role: Role.SUPERADMIN, platform: true, permissions: ['*'] },
  { email: 'qa.owner@aurea.test', name: 'QA Owner', role: Role.OWNER, permissions: ['*'] },
  { email: 'qa.manager@aurea.test', name: 'QA Manager', role: Role.MANAGER, permissions: ['catalog.read', 'catalog.write', 'bookings.read', 'bookings.write'] },
  { email: 'qa.staff@aurea.test', name: 'QA Staff', role: Role.STAFF, permissions: ['catalog.read', 'bookings.read'] },
  { email: 'qa.cashier@aurea.test', name: 'QA Cashier', role: Role.CASHIER, permissions: ['catalog.read'] },
];

async function main() {
  const roleDefinitions = [
    { key: 'tenant_owner', scope: 'tenant', permissions: ['*'] },
    { key: 'tenant_manager', scope: 'tenant', permissions: ['tenant:employees:read', 'tenant:employees:manage'] },
    { key: 'tenant_staff', scope: 'tenant', permissions: ['tenant:employees:read'] },
    { key: 'tenant_cashier', scope: 'tenant', permissions: ['tenant:orders:read', 'tenant:orders:manage'] },
    { key: 'platform_owner', scope: 'platform', permissions: ['*'] },
    { key: 'platform_readonly', scope: 'platform', permissions: ['platform:read'] },
  ];
  for (const role of roleDefinitions) {
    await prisma.roleDefinition.upsert({ where: { key: role.key }, update: role, create: role });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: 'De Santas Studio', vertical: 'beauty', isActive: true },
    create: {
      slug: tenantSlug,
      name: 'De Santas Studio',
      vertical: 'beauty',
      isActive: true,
      settings: { branding: { primaryColor: '#7c3aed', tagline: 'Estudio de Belleza & Turnos' } },
    },
  });

  for (const featureKey of ['catalog', 'bookings', 'social_hub']) {
    await prisma.tenantFeature.upsert({
      where: { tenantId_featureKey: { tenantId: tenant.id, featureKey } },
      update: { isEnabled: true },
      create: { tenantId: tenant.id, featureKey, isEnabled: true },
    });
  }

  for (const item of [
    { title: 'Corte y brushing', description: 'Servicio de peluquería de prueba', priceCents: 18000, category: 'Peluquería', isService: true, durationMin: 60 },
    { title: 'Coloración', description: 'Servicio de coloración de prueba', priceCents: 35000, category: 'Color', isService: true, durationMin: 120 },
    { title: 'Shampoo nutritivo', description: 'Producto de catálogo de prueba', priceCents: 9500, category: 'Productos', isService: false, durationMin: null },
  ]) {
    const existing = await prisma.catalogItem.findFirst({ where: { tenantId: tenant.id, title: item.title } });
    if (existing) await prisma.catalogItem.update({ where: { id: existing.id }, data: { ...item, isActive: true } });
    else await prisma.catalogItem.create({ data: { ...item, tenantId: tenant.id } });
  }

  for (const item of users) {
    const roleKey = item.platform ? 'tenant_owner' : {
      OWNER: 'tenant_owner',
      MANAGER: 'tenant_manager',
      STAFF: 'tenant_staff',
      CASHIER: 'tenant_cashier',
      SUPERADMIN: 'tenant_owner',
    }[item.role];
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: { name: item.name, passwordHash, active: true },
      create: { email: item.email, name: item.name, passwordHash, active: true },
    });

    if (item.platform) {
      await prisma.platformMembership.upsert({
        where: { userId_roleKey: { userId: user.id, roleKey: 'SUPERADMIN' } },
        update: { isActive: true },
        create: { userId: user.id, roleKey: 'SUPERADMIN', isActive: true },
      });
    }

    await prisma.tenantUser.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: { role: item.role, roleKey, permissions: item.permissions, isActive: true },
      create: { tenantId: tenant.id, userId: user.id, role: item.role, roleKey, permissions: item.permissions, isActive: true },
    });
  }

  console.log(JSON.stringify({
    ok: true,
    tenant: { slug: tenant.slug, id: tenant.id },
    users: users.map(({ email, role }) => ({ email, role })),
    password,
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
