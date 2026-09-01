import { describe, expect, it } from 'vitest';
import { CapabilityEvaluator, type CapabilityCatalogEntry } from './capability-evaluator.js';

const catalog: CapabilityCatalogEntry[] = [
  { key: 'services', kind: 'module', moduleKey: 'services', sectionKey: 'services', pageKey: 'root', scope: 'tenant', status: 'active' },
  { key: 'services.bookings', kind: 'module', moduleKey: 'services.bookings', sectionKey: 'services', pageKey: 'bookings', scope: 'tenant', status: 'active' },
  { key: 'services.bookings.create', kind: 'function', moduleKey: 'services.bookings', sectionKey: 'services', pageKey: 'bookings', scope: 'tenant', status: 'active', permissions: ['bookings:create'] },
  { key: 'services.bookings.legacy', kind: 'function', moduleKey: 'services.bookings', sectionKey: 'services', pageKey: 'bookings', scope: 'tenant', status: 'deprecated' },
];

describe('CapabilityEvaluator', () => {
  const base = { surface: 'private' as const, tenantStatus: 'active' as const, subscriptionAllowed: true };

  it('applies owner > tenant > plan precedence', () => {
    const result = new CapabilityEvaluator().evaluate(catalog, {
      ...base,
      planRules: [{ key: 'services.*', effect: 'deny' }],
      tenantRules: [{ key: 'services.bookings', effect: 'deny' }],
      ownerOverrides: [{ key: 'services.bookings', effect: 'allow' }, { key: 'services', effect: 'allow' }],
      permissions: ['bookings:create'],
    });
    expect(result.map['services.bookings']).toBe(true);
    expect(result.map['services.bookings.create']).toBe(true);
  });

  it('requires active parents and dependencies', () => {
    const result = new CapabilityEvaluator().evaluate(catalog, {
      ...base,
      planRules: [{ key: 'services.*', effect: 'allow' }],
      permissions: ['bookings:create'],
      creditsAvailable: { 'services.bookings.create': false },
    });
    expect(result.map['services.bookings']).toBe(true);
    expect(result.map['services.bookings.create']).toBe(false);
    expect(result.map['services.bookings.legacy']).toBe(false);
  });

  it('does not apply private role or permissions to public surface', () => {
    const result = new CapabilityEvaluator().evaluate([{
      ...catalog[2],
      requiredRole: 'manager',
    }], {
      surface: 'public',
      tenantStatus: 'active',
      subscriptionAllowed: true,
      planRules: [{ key: 'services.bookings.create', effect: 'allow' }],
    });
    expect(result.map['services.bookings.create']).toBe(true);
  });

  it('denies suspended tenants regardless of overrides', () => {
    const result = new CapabilityEvaluator().evaluate([catalog[0]], {
      ...base,
      tenantStatus: 'suspended',
      ownerOverrides: [{ key: 'services', effect: 'allow' }],
    });
    expect(result.map.services).toBe(false);
  });
});
