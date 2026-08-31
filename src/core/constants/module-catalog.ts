export interface ModuleFeatureDefinition {
  key: string;
  name: string;
  description: string;
  section: string;
  page: string;
  module: string;
  requiredPermissions: string[];
  creditCost: number;
  status: 'active' | 'toBeDeprecated' | 'deprecated';
}

/**
 * Technical catalog for the first dynamic-modules POC.
 * The definitions are code-owned; tenant enablement is stored in MongoDB.
 */
export const MODULE_CATALOG: ModuleFeatureDefinition[] = [
  {
    key: 'services.bookings',
    name: 'Reservas',
    description: 'Página y operación de reservas para servicios.',
    section: 'services',
    page: 'bookings',
    module: 'bookings',
    requiredPermissions: ['bookings:read'],
    creditCost: 40,
    status: 'active',
  },
  {
    key: 'services.bookings.create',
    name: 'Crear reservas',
    description: 'Permite crear nuevas reservas.',
    section: 'services',
    page: 'bookings',
    module: 'bookings',
    requiredPermissions: ['bookings:write'],
    creditCost: 0,
    status: 'active',
  },
  {
    key: 'services.bookings.reschedule',
    name: 'Reprogramar turno',
    description: 'Permite modificar fecha y horario de una reserva.',
    section: 'services',
    page: 'bookings',
    module: 'bookings',
    requiredPermissions: ['bookings:write'],
    creditCost: 0,
    status: 'active',
  },
  {
    key: 'services.bookings.photo_upload',
    name: 'Subir foto a la reserva',
    description: 'Permite adjuntar fotos desde la página pública y el backoffice.',
    section: 'services',
    page: 'bookings',
    module: 'bookings',
    requiredPermissions: ['bookings:write'],
    creditCost: 10,
    status: 'active',
  },
  {
    key: 'sales.catalog',
    name: 'Catálogo',
    description: 'Productos y servicios publicados por el negocio.',
    section: 'sales',
    page: 'catalog',
    module: 'catalog',
    requiredPermissions: ['catalog:read'],
    creditCost: 20,
    status: 'active',
  },
  {
    key: 'operations.inventory',
    name: 'Stock',
    description: 'Inventario, movimientos y alertas de reposición.',
    section: 'operations',
    page: 'inventory',
    module: 'inventory',
    requiredPermissions: ['inventory:read'],
    creditCost: 30,
    status: 'active',
  },
];

export function findModuleFeature(key: string) {
  return MODULE_CATALOG.find((feature) => feature.key === key);
}

export function expandLegacyFeatureKeys(featureKeys: string[]) {
  const expanded = new Set(featureKeys);
  const aliases: Record<string, string[]> = {
    catalog: ['sales.catalog'],
    bookings: ['services.bookings', 'services.bookings.create', 'services.bookings.reschedule'],
    delivery: ['sales.delivery'],
    tables: ['sales.tables'],
    reviews: ['marketing.reviews'],
  };
  for (const key of featureKeys) {
    for (const capability of aliases[key] ?? []) expanded.add(capability);
  }
  return [...expanded];
}

export function buildCapabilityTree(activeFeatureKeys: string[]) {
  const active = new Set(activeFeatureKeys);
  return MODULE_CATALOG.reduce<Record<string, any>>((tree, feature) => {
    tree[feature.section] ??= { key: feature.section, name: feature.section, pages: {} };
    tree[feature.section].pages[feature.page] ??= {
      key: `${feature.section}.${feature.page}`,
      name: feature.page,
      features: [],
      enabled: active.has(`${feature.section}.${feature.page}`),
    };
    tree[feature.section].pages[feature.page].features.push({
      ...feature,
      enabled: active.has(feature.key),
    });
    return tree;
  }, {});
}
