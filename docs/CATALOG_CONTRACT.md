# Contrato de catálogo y capabilities

El contrato compartido vive en `src/catalog/contracts` y define la forma que deben
usar los manifiestos, el backend y el frontend para describir módulos dinámicos.

Cada contrato tiene una versión semántica y cada módulo y función posee una `key`
estable. El validador rechaza:

- claves duplicadas o con formato no estable;
- scopes distintos de `platform`, `tenant` o `public`;
- estados fuera de `draft`, `active`, `toBeDeprecated` y `deprecated`;
- versiones de compatibilidad inválidas;
- dependencias inexistentes, autoreferencias o ciclos;
- módulos sin funciones.

Las dependencias referencian otras claves del mismo snapshot. La activación del
tenant y los permisos efectivos se resuelven en el backend; este contrato solo
describe qué existe y qué restricciones técnicas/comerciales declara cada pieza.

Ejemplo mínimo:

```ts
import { validateCatalogContract } from './contracts/index.js';

const catalog = validateCatalogContract({
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
      key: 'services.bookings.photo_upload',
      label: 'Upload booking photo',
      scope: 'public',
      status: 'active',
      permissions: ['bookings:write'],
      dependencies: ['services.bookings'],
      compatibility: { minVersion: '1.0.0' },
    }],
  }],
});
```

El snapshot generado por manifiestos debe validarse en CI antes de sincronizarse
con `module_catalog`.
