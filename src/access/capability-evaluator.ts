export type CapabilitySurface = 'public' | 'private';

export interface CapabilityCatalogEntry {
  key: string;
  kind: 'module' | 'function';
  moduleKey: string;
  sectionKey: string;
  pageKey: string;
  scope: 'platform' | 'tenant' | 'public';
  status: 'draft' | 'active' | 'toBeDeprecated' | 'deprecated';
  requiredRole?: string;
  permissions?: string[];
  dependencies?: string[];
}

export interface CapabilityRule {
  key: string;
  effect: 'allow' | 'deny';
}

export interface CapabilityEvaluationContext {
  surface: CapabilitySurface;
  tenantStatus: 'active' | 'suspended' | 'deleted';
  subscriptionAllowed: boolean;
  lifecycleAllowed?: boolean;
  planRules?: CapabilityRule[];
  tenantRules?: CapabilityRule[];
  ownerOverrides?: CapabilityRule[];
  creditsAvailable?: Record<string, boolean>;
  role?: string;
  permissions?: string[];
}

export interface EvaluatedCapability extends CapabilityCatalogEntry {
  enabled: boolean;
}

export interface CapabilityEvaluationResult {
  map: Record<string, boolean>;
  tree: EvaluatedCapability[];
}

export class CapabilityEvaluator {
  evaluate(catalog: CapabilityCatalogEntry[], context: CapabilityEvaluationContext): CapabilityEvaluationResult {
    const entries = [...catalog].sort((a, b) => a.key.localeCompare(b.key));
    const map: Record<string, boolean> = {};
    const byKey = new Map(entries.map((entry) => [entry.key, entry]));

    const resolve = (entry: CapabilityCatalogEntry, visiting = new Set<string>()): boolean => {
      if (map[entry.key] !== undefined) return map[entry.key];
      if (visiting.has(entry.key)) return (map[entry.key] = false);
      if (context.tenantStatus !== 'active' || !context.subscriptionAllowed || context.lifecycleAllowed === false) return (map[entry.key] = false);
      if (entry.status !== 'active') return (map[entry.key] = false);
      const decision = this.resolveRule(entry.key, context);
      if (decision === false) return (map[entry.key] = false);
      if (context.creditsAvailable?.[entry.key] === false) return (map[entry.key] = false);

      const next = new Set(visiting).add(entry.key);
      const dependencies = entry.dependencies ?? [];
      if (dependencies.some((key) => !byKey.has(key) || !resolve(byKey.get(key)!, next))) {
        return (map[entry.key] = false);
      }
      const parents = this.parentKeys(entry.key).filter((key) => byKey.has(key));
      if (parents.some((key) => !resolve(byKey.get(key)!, next))) return (map[entry.key] = false);

      if (context.surface === 'private') {
        if (entry.requiredRole && entry.requiredRole !== context.role) return (map[entry.key] = false);
        const required = entry.permissions ?? [];
        if (required.some((permission) => !(context.permissions ?? []).includes('*') && !(context.permissions ?? []).includes(permission))) {
          return (map[entry.key] = false);
        }
      }
      return (map[entry.key] = true);
    };

    for (const entry of entries) resolve(entry);
    return { map, tree: entries.map((entry) => ({ ...entry, enabled: map[entry.key] })) };
  }

  private resolveRule(key: string, context: CapabilityEvaluationContext): boolean {
    const owner = this.findRule(context.ownerOverrides, key);
    if (owner) return owner.effect === 'allow';
    const tenant = this.findRule(context.tenantRules, key);
    if (tenant) return tenant.effect === 'allow';
    const plan = this.findRule(context.planRules, key);
    return plan?.effect === 'allow';
  }

  private findRule(rules: CapabilityRule[] | undefined, key: string): CapabilityRule | undefined {
    return rules
      ?.filter((rule) => {
        if (rule.key === key) return true;
        if (rule.key.endsWith('.*')) {
          const prefix = rule.key.slice(0, -2);
          return key === prefix || key.startsWith(`${prefix}.`);
        }
        return key.startsWith(`${rule.key}.`);
      })
      .sort((a, b) => b.key.replace('.*', '').length - a.key.replace('.*', '').length)[0];
  }

  private parentKeys(key: string): string[] {
    const parts = key.split('.');
    return Array.from({ length: Math.max(parts.length - 1, 0) }, (_, index) =>
      parts.slice(0, index + 1).join('.'),
    );
  }
}
