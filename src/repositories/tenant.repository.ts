import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { RoleConstants } from '../core/constants/index.js';

@Injectable()
export class TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        features: true,
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        features: true,
      },
    });
  }

  async findByIdWithDetails(id: string) {
    return this.prisma.tenant.findUnique({
      where: { id },
      include: {
        features: true,
        memberships: {
          include: {
            user: {
              select: { id: true, name: true, email: true, active: true },
            },
          },
        },
        _count: {
          select: { catalogItems: true },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.tenant.findUnique({
      where: { slug },
    });
  }

  async create(data: {
    name: string;
    slug: string;
    vertical: string;
    settings?: Record<string, any>;
    ownerId?: string;
    defaultFeatures: string[];
  }) {
    return this.prisma.tenant.create({
      data: {
        name: data.name.trim(),
        slug: data.slug.trim(),
        vertical: data.vertical.trim(),
        settings: data.settings ?? {},
        memberships: data.ownerId
          ? {
              create: {
                userId: data.ownerId,
                role: Role.OWNER,
                permissions: [RoleConstants.ALL_PERMISSIONS],
              },
            }
          : undefined,
        features: {
          createMany: {
            data: data.defaultFeatures.map((featureKey) => ({
              featureKey,
              isEnabled: true,
            })),
          },
        },
      },
      include: {
        features: true,
        memberships: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
      },
    });
  }

  async update(id: string, data: Partial<{
    name: string;
    vertical: string;
    isActive: boolean;
    maintenanceMode: boolean;
    maintenanceMessage: string | null;
    deprecatedAt: Date | null;
    publicAccessUntil: Date | null;
    settings: Record<string, any>;
  }>) {
    return this.prisma.tenant.update({
      where: { id },
      data,
      include: {
        features: true,
      },
    });
  }

  async delete(id: string) {
    await this.prisma.invitation.deleteMany({
      where: { tenantId: id },
    });

    return this.prisma.tenant.delete({
      where: { id },
    });
  }

  async findOrCreateSystemTenant(slug: string, name: string, vertical: string) {
    let systemTenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!systemTenant) {
      systemTenant = await this.prisma.tenant.create({
        data: {
          name,
          slug,
          vertical,
          isActive: true,
        },
      });
    }

    return systemTenant;
  }

  async upsertMembership(
    tenantId: string,
    userId: string,
    role: Role,
    permissions: string[] = [RoleConstants.ALL_PERMISSIONS],
  ) {
    return this.prisma.tenantUser.upsert({
      where: {
        tenantId_userId: {
          tenantId,
          userId,
        },
      },
      update: {
        role,
        permissions,
        isActive: true,
      },
      create: {
        tenantId,
        userId,
        role,
        permissions,
        isActive: true,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  async findMembershipsByTenantId(tenantId: string) {
    return this.prisma.tenantUser.findMany({
      where: { tenantId, isActive: true },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            active: true,
          },
        },
      },
    });
  }

  async findMembership(tenantId: string, userId: string) {
    return this.prisma.tenantUser.findUnique({ where: { tenantId_userId: { tenantId, userId } } });
  }

  async updateMembership(tenantId: string, userId: string, data: {
    role?: Role;
    roleKey?: string | null;
    permissions?: string[];
    isActive?: boolean;
  }) {
    return this.prisma.tenantUser.update({
      where: { tenantId_userId: { tenantId, userId } },
      data,
      include: { user: { select: { id: true, email: true, name: true, avatarUrl: true } } },
    });
  }

  async countActiveOwners(tenantId: string) {
    return this.prisma.tenantUser.count({ where: { tenantId, role: Role.OWNER, isActive: true } });
  }

  async removeMembership(tenantId: string, userId: string) {
    return this.prisma.tenantUser.delete({ where: { tenantId_userId: { tenantId, userId } } });
  }

  async findPlatformMembership(userId: string, roleKey = 'SUPERADMIN') {
    return this.prisma.platformMembership.findFirst({
      where: { userId, roleKey, isActive: true },
    });
  }

  /** Backward-compatible name; it now reads the platform scope only. */
  async findSuperadminMembership(userId: string) {
    return this.findPlatformMembership(userId);
  }

  async upsertPlatformMembership(userId: string, roleKey = 'SUPERADMIN') {
    return this.prisma.platformMembership.upsert({
      where: { userId_roleKey: { userId, roleKey } },
      update: { isActive: true },
      create: { userId, roleKey, isActive: true },
    });
  }

  async upsertFeature(tenantId: string, featureKey: string, isEnabled: boolean) {
    return this.prisma.tenantFeature.upsert({
      where: {
        tenantId_featureKey: {
          tenantId,
          featureKey,
        },
      },
      update: { isEnabled },
      create: {
        tenantId,
        featureKey,
        isEnabled,
      },
    });
  }

  async batchUpsertFeatures(
    tenantId: string,
    features: { featureKey: string; isEnabled: boolean }[],
  ) {
    const upserts = features.map((f) =>
      this.prisma.tenantFeature.upsert({
        where: {
          tenantId_featureKey: {
            tenantId,
            featureKey: f.featureKey,
          },
        },
        update: { isEnabled: f.isEnabled },
        create: {
          tenantId,
          featureKey: f.featureKey,
          isEnabled: f.isEnabled,
        },
      }),
    );

    await this.prisma.$transaction(upserts);
    return this.findFeaturesByTenantId(tenantId);
  }

  async findFeaturesByTenantId(tenantId: string) {
    return this.prisma.tenantFeature.findMany({
      where: { tenantId },
    });
  }
}
