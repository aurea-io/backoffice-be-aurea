import { describe, expect, it } from 'vitest';
import { validateCatalogContract } from './catalog-contract.validator.js';

const validContract = {
  version: '1.0.0',
  modules: [
    {
      key: 'sales',
      label: 'Sales',
      section: 'commerce',
      page: 'sales',
      scope: 'tenant',
      status: 'active',
      requiredRole: 'MANAGER',
      compatibility: { minVersion: '1.0.0' },
      functions: [
        {
          key: 'sales.orders.view',
          label: 'View orders',
          scope: 'tenant',
          status: 'active',
          permissions: ['orders.view'],
          compatibility: { minVersion: '1.0.0' },
        },
      ],
    },
  ],
};

describe('validateCatalogContract', () => {
  it('accepts the shared versioned contract', () => {
    expect(validateCatalogContract(validContract)).toEqual(validContract);
  });

  it('rejects duplicate keys and unknown dependencies', () => {
    expect(() => validateCatalogContract({
      ...validContract,
      modules: [{ ...validContract.modules[0], functions: [validContract.modules[0].functions[0], validContract.modules[0].functions[0]] }],
    })).toThrow(/Duplicate catalog key/);
    expect(() => validateCatalogContract({
      ...validContract,
      modules: [{ ...validContract.modules[0], dependencies: ['missing'] }],
    })).toThrow(/Unknown dependency/);
  });

  it('rejects dependency cycles and invalid scopes', () => {
    const withCycle = {
      ...validContract,
      modules: [{
        ...validContract.modules[0],
        dependencies: ['sales.orders.view'],
        functions: [{ ...validContract.modules[0].functions[0], dependencies: ['sales'] }],
      }],
    };
    const withInvalidScope = {
      ...validContract,
      modules: [{ ...validContract.modules[0], scope: 'private' }],
    };
    expect(() => validateCatalogContract(withCycle)).toThrow(/cycle/);
    expect(() => validateCatalogContract(withInvalidScope)).toThrow(/platform, tenant, or public/);
  });
});
