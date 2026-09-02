import { describe, expect, it } from 'vitest';
import { catalogManifest } from './catalog.manifest.js';
import { buildCatalogContract, defineCatalogManifest } from './registry.js';

describe('catalog manifest registry', () => {
  it('builds one validated snapshot from domain manifests', () => {
    const snapshot = buildCatalogContract([catalogManifest]);
    expect(snapshot.version).toBe('1.0.0');
    expect(snapshot.modules[0].functions).toHaveLength(2);
  });

  it('rejects duplicate keys when manifests are combined', () => {
    const duplicate = defineCatalogManifest({
      ...catalogManifest,
      functions: catalogManifest.functions.map((fn) => ({
        ...fn,
        key: fn.key.replace('catalog', 'inventory'),
        dependencies: fn.dependencies?.map((dependency) => dependency.replace('catalog', 'inventory')),
      })),
    });
    expect(() => buildCatalogContract([catalogManifest, duplicate])).toThrow(
      /Duplicate catalog key/,
    );
  });

  it('rejects a manifest with an invalid dependency before registration', () => {
    expect(() => defineCatalogManifest({
      ...catalogManifest,
      key: 'broken',
      dependencies: ['does-not-exist'],
    })).toThrow(/Unknown dependency/);
  });
});
