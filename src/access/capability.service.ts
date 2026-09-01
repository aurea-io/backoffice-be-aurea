import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CapabilityEvaluator,
  type CapabilityCatalogEntry,
  type CapabilityEvaluationResult,
} from './capability-evaluator.js';
import {
  EntitlementResolver,
  type EntitlementRule,
} from './entitlement-resolver.js';

@Injectable()
export class CapabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evaluator: CapabilityEvaluator,
    private readonly entitlementResolver: EntitlementResolver,
  ) {}

  async evaluateForTenant(
    userId: string,
    tenantId: string,
    surface: 'public' | 'private' = 'private',
  ): Promise<CapabilityEvaluationResult> {
    const membership = await this.prisma.tenantUser.findFirst({
      where: { userId, tenantId, isActive: true },
      include: {
        tenant: {
          include: {
            features: true,
            entitlements: { where: { isActive: true } },
            subscriptions: {
              where: { status: { in: ['active', 'trialing'] } },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!membership || !membership.tenant.isActive) {
      throw new ForbiddenException('You do not have access to this tenant.');
    }

    const entries = await this.prisma.moduleCatalogEntry.findMany({
      where: { isArchived: false },
      orderBy: { key: 'asc' },
    });

    const legacyFeatureRules: EntitlementRule[] = membership.tenant.features.map((feature) => ({
      key: feature.featureKey,
      effect: feature.isEnabled ? 'allow' : 'deny',
      source: 'tenant_setting',
    }));

    const entitlements: EntitlementRule[] = membership.tenant.entitlements.map((item) => ({
      key: item.capabilityKey,
      effect: item.effect,
      source: item.source,
    }));

    const result = this.evaluator.evaluate(
      entries.map((entry) => this.toCatalogEntry(entry)),
      {
        surface,
        tenantStatus: membership.tenant.isActive ? 'active' : 'suspended',
        subscriptionAllowed: membership.tenant.subscriptions.length > 0,
        planRules: entitlements.filter((rule) => rule.source === 'plan' || rule.source === 'migration'),
        tenantRules: [...legacyFeatureRules, ...entitlements.filter((rule) => rule.source === 'tenant_setting')],
        ownerOverrides:
          membership.role === 'OWNER'
            ? entitlements.filter((rule) => rule.source === 'owner_override')
            : [],
        role: membership.role,
        permissions: membership.permissions,
      },
    );

    return result;
  }

  async isEnabled(userId: string, tenantId: string, capabilityKey: string): Promise<boolean> {
    const result = await this.evaluateForTenant(userId, tenantId);
    return result.map[capabilityKey] === true;
  }

  private toCatalogEntry(entry: any): CapabilityCatalogEntry {
    return {
      key: entry.key,
      kind: entry.kind === 'function' ? 'function' : 'module',
      moduleKey: entry.moduleKey,
      sectionKey: entry.sectionKey,
      pageKey: entry.pageKey,
      scope: entry.scope === 'platform' || entry.scope === 'public' ? entry.scope : 'tenant',
      status:
        entry.status === 'draft' || entry.status === 'toBeDeprecated' || entry.status === 'deprecated'
          ? entry.status
          : 'active',
      requiredRole: entry.requiredRole ?? undefined,
      permissions: entry.permissions ?? [],
      dependencies: entry.dependencies ?? [],
    };
  }
}
