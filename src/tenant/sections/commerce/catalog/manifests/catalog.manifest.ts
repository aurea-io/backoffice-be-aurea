import { defineCatalogManifest } from './registry.js';

export const catalogManifest = defineCatalogManifest({
  key: 'catalog',
  label: 'Catalog',
  section: 'commerce',
  page: 'catalog',
  scope: 'tenant',
  status: 'active',
  requiredRole: 'tenant_admin',
  compatibility: { minVersion: '1.0.0' },
  functions: [
    {
      key: 'catalog.items.view',
      label: 'View catalog items',
      scope: 'tenant',
      status: 'active',
      permissions: ['catalog:read'],
      compatibility: { minVersion: '1.0.0' },
    },
    {
      key: 'catalog.items.manage',
      label: 'Manage catalog items',
      scope: 'tenant',
      status: 'active',
      permissions: ['catalog:write'],
      dependencies: ['catalog.items.view'],
      compatibility: { minVersion: '1.0.0' },
    },
  ],
});

export const catalogManifests = [catalogManifest] as const;
