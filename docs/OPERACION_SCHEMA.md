# Despliegue del esquema

El backend usa Prisma sobre MongoDB. Cada cambio de modelo debe validarse y desplegarse contra la base del ambiente antes de habilitar la funcionalidad:

```bash
npx prisma validate
npx prisma generate
npx prisma db push
```

`db push` debe ejecutarse con el `DATABASE_URL` del ambiente correspondiente y luego verificarse con el build y la suite de tests. En producción, hacer primero backup y revisión del diff del esquema. Las nuevas entidades de catálogo (`CatalogCategory`, `CatalogModifierGroup`, `CatalogModifierOption`) y sus índices forman parte del contrato actual.
