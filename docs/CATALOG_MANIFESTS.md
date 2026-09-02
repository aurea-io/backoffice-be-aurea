# Manifiestos de módulos

Cada dominio declara su módulo en `src/tenant/sections/<section>/<page>/manifests`
(o en la carpeta del dominio cuando este crezca) mediante
`defineCatalogManifest`. En el backoffice actual, el catálogo vive en
`src/tenant/sections/commerce/catalog/manifests`. El registro combina
los manifiestos con `buildCatalogContract`, que vuelve a validar el snapshot
completo antes de exponerlo o sincronizarlo con MongoDB.

La convención mínima de un manifiesto es:

```text
key, label, section, page, scope, status, compatibility
└── functions[]
    └── key, label, scope, status, permissions, dependencies, compatibility
```

Las claves completas son estables (`catalog.items.manage`) y no deben depender de
la URL de una pantalla. Un manifiesto puede depender de otra función o módulo;
las referencias inexistentes, claves duplicadas y ciclos hacen fallar el registro.

El registro no activa capacidades para ningún tenant. Solo publica la definición
técnica; plan, entitlements, mantenimiento y permisos efectivos siguen siendo
decisiones del backend.
