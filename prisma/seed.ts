import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
