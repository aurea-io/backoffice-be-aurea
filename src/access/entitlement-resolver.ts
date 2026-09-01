export type EntitlementEffect = 'allow' | 'deny';
export type EntitlementSource = 'plan' | 'tenant_setting' | 'owner_override' | 'migration';

export interface EntitlementRule {
  key: string;
  effect: EntitlementEffect;
  source?: EntitlementSource;
}

export interface EntitlementContext {
  planRules?: EntitlementRule[];
  tenantRules?: EntitlementRule[];
  ownerOverrides?: EntitlementRule[];
  defaultEffect?: EntitlementEffect;
  enabledParents?: Set<string>;
}

export interface EffectiveEntitlement {
  key: string;
  effect: EntitlementEffect;
  source: EntitlementSource | 'default';
}

export class EntitlementResolver {
  resolve(key: string, context: EntitlementContext): EffectiveEntitlement {
    const owner = this.match(context.ownerOverrides, key);
    if (owner) return { key, effect: owner.effect, source: 'owner_override' };
    const tenant = this.match(context.tenantRules, key);
    if (tenant) return { key, effect: tenant.effect, source: 'tenant_setting' };
    const plan = this.match(context.planRules, key);
    if (plan) return { key, effect: plan.effect, source: plan.source ?? 'plan' };
    return { key, effect: context.defaultEffect ?? 'deny', source: 'default' };
  }

  isEnabled(key: string, context: EntitlementContext): boolean {
    if (this.resolve(key, context).effect !== 'allow') return false;
    return this.parents(key).every((parent) => {
      const result = this.resolve(parent, context);
      return result.effect === 'allow' && (context.enabledParents?.has(parent) ?? true);
    });
  }

  private match(rules: EntitlementRule[] | undefined, key: string): EntitlementRule | undefined {
    return rules
      ?.filter((rule) => {
        const prefix = rule.key.endsWith('.*') ? rule.key.slice(0, -2) : rule.key;
        return key === prefix || key.startsWith(prefix + '.');
      })
      .sort((a, b) => b.key.replace('.*', '').length - a.key.replace('.*', '').length)[0];
  }

  private parents(key: string): string[] {
    const parts = key.split('.');
    return Array.from({ length: Math.max(parts.length - 1, 0) }, (_, index) =>
      parts.slice(0, index + 1).join('.'),
    );
  }
}
