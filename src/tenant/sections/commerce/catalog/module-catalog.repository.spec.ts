import { describe, expect, it } from 'vitest';
import { catalogEntries } from './module-catalog.repository.js';

describe('catalogEntries', () => {
  it('flattens modules and functions while preserving hierarchy, scope, and version', () => {
    const entries = catalogEntries({
      version: '1.0.0',
      modules: [{
        key: 'services.bookings',
        label: 'Bookings',
        section: 'services',
        page: 'bookings',
        scope: 'tenant',
        status: 'active',
        compatibility: { minVersion: '1.0.0' },
        functions: [{
          key: 'services.bookings.create',
          label: 'Create booking',
          scope: 'tenant',
          status: 'active',
          permissions: ['bookings:write'],
          compatibility: { minVersion: '1.0.0' },
        }],
      }],
    });
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ kind: 'module', moduleKey: 'services.bookings', scope: 'tenant', catalogVersion: '1.0.0' });
    expect(entries[1]).toMatchObject({ kind: 'function', moduleKey: 'services.bookings', scope: 'tenant', permissions: ['bookings:write'] });
  });
});
