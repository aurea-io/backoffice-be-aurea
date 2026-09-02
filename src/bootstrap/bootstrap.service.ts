import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class BootstrapService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublicBootstrap(publicId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: publicId.trim().toLowerCase() },
      include: {
        features: { where: { isEnabled: true }, select: { featureKey: true } },
        entitlements: {
          where: { isActive: true },
          select: { capabilityKey: true, effect: true },
        },
        brandingVersions: {
          where: { isPublished: true },
          orderBy: { version: 'desc' },
          take: 1,
          select: { version: true },
        },
      },
    });

    if (!tenant || !tenant.isActive) throw new NotFoundException('Tenant not found.');

    const brandingVersion = tenant.brandingVersions[0]?.version ?? 0;
    const capabilities = tenant.entitlements
      .filter((entry) => entry.effect === 'allow')
      .map((entry) => entry.capabilityKey);

    return {
      publicId: tenant.slug,
      tenant: {
        name: tenant.name,
        vertical: tenant.vertical,
        settings: tenant.settings ?? {},
      },
      capabilities: [...new Set([...tenant.features.map((f) => f.featureKey), ...capabilities])],
      version: brandingVersion,
      stylesheet: `/api/style/${encodeURIComponent(tenant.slug)}.css?v=${brandingVersion}`,
    };
  }
}
