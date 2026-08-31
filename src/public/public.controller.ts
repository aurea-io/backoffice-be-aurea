import {
  Controller,
  Get,
  Param,
  Res,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../core/decorators/public.decorator.js';
import { MODULE_CATALOG, buildCapabilityTree, expandLegacyFeatureKeys } from '../core/constants/module-catalog.js';

@Public()
@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('tenants/:slug/config')
  async getTenantConfig(@Param('slug') slug: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || !tenant.isActive) throw new NotFoundException('Public tenant not found.');

    const legacyFeatureKeys = (await this.prisma.tenantFeature.findMany({
      where: { tenantId: tenant.id, isEnabled: true },
      select: { featureKey: true },
    })).map((feature) => feature.featureKey);
    const activeFeatureKeys = expandLegacyFeatureKeys(legacyFeatureKeys);

    return {
      tenant: { id: tenant.id, slug: tenant.slug, name: tenant.name, vertical: tenant.vertical },
      settings: tenant.settings ?? {},
      catalogVersion: MODULE_CATALOG.length,
      capabilities: Object.fromEntries(MODULE_CATALOG.map((feature) => [feature.key, activeFeatureKeys.includes(feature.key)])),
      capabilityTree: buildCapabilityTree(activeFeatureKeys),
    };
  }

  @Get('tenants/:slug/style.css')
  async getTenantStyle(@Param('slug') slug: string, @Res() response: Response) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug } });
    if (!tenant || !tenant.isActive) throw new NotFoundException('Public tenant not found.');

    const settings = (tenant.settings as Record<string, any> | null) ?? {};
    const branding = settings.branding ?? {};
    const colors = branding.colors ?? {};
    const safeColor = (value: unknown, fallback: string) =>
      typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
    const css = `:root{--aurea-primary:${safeColor(branding.primaryColor ?? colors.primary, '#7c3aed')};--aurea-accent:${safeColor(branding.accentColor ?? colors.accent, '#6b8f71')};--aurea-background:${safeColor(colors.background, '#faf8fc')};--aurea-text:${safeColor(colors.text, '#18181b')}}`;
    response.setHeader('Content-Type', 'text/css; charset=utf-8');
    response.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=3600');
    response.setHeader('ETag', `"${tenant.id}-${tenant.updatedAt.getTime()}"`);
    return response.send(css);
  }
}
