import { describe, expect, it } from 'vitest';
import { EntitlementResolver } from './entitlement-resolver.js';

describe('EntitlementResolver', () => {
  const resolver = new EntitlementResolver();

  it('applies owner > tenant > plan precedence', () => {
    const result = resolver.resolve('services.bookings.create', {
      planRules: [{ key: 'services.*', effect: 'deny' }],
      tenantRules: [{ key: 'services.bookings', effect: 'deny' }],
      ownerOverrides: [{ key: 'services.bookings', effect: 'allow' }],
    });
    expect(result).toEqual({ key: 'services.bookings.create', effect: 'allow', source: 'owner_override' });
  });

  it('does not allow a child when a parent is denied', () => {
    expect(resolver.isEnabled('services.bookings.create', {
      planRules: [{ key: 'services.*', effect: 'allow' }, { key: 'services.bookings', effect: 'deny' }],
    })).toBe(false);
  });

  it('accepts enabled parent capabilities without requiring the leaf itself', () => {
    expect(resolver.isEnabled('services.bookings.create', {
      planRules: [
        { key: 'services', effect: 'allow' },
        { key: 'services.bookings', effect: 'allow' },
        { key: 'services.bookings.create', effect: 'allow' },
      ],
      enabledParents: new Set(['services', 'services.bookings']),
    })).toBe(true);
  });

  it('supports immediate tenant changes over plan rules', () => {
    expect(resolver.isEnabled('services.bookings', {
      planRules: [{ key: 'services.*', effect: 'deny' }],
      tenantRules: [{ key: 'services', effect: 'allow' }, { key: 'services.bookings', effect: 'allow' }],
    })).toBe(true);
  });

  it('reports default provenance when no plan rule matches', () => {
    expect(resolver.resolve('payments', {}).source).toBe('default');
  });

  it('defaults to deny and never invents an allow', () => {
    expect(resolver.isEnabled('payments', {})).toBe(false);
  });
});
