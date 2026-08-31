# 📋 Fases de Desarrollo: Gestión de Tenants, Planes y Empleados
### Aurea Backoffice (`backoffice-be-aurea` & `backoffice-fe-aurea`)

Este documento detalla el estado actual (**Lo que está hecho**) y el alcance pendiente (**Lo que resta por hacer**) para los módulos de:
1. **Gestión de Planes, Membresías y Suscripciones (Monetización recurrente)**.
2. **Gestión de Tenants (Comercios y Módulos)**.
3. **Gestión de Empleados y Equipo (Roles, Permisos y Smart Presets)**.

---

## 🏛️ 1. Arquitectura de 3 Niveles (Planes ➡️ Tenants ➡️ Empleados)

```mermaid
graph TD
    subgraph "NIVEL 1: Planes & Membresías (Superadmin / Facturación)"
        PL[Plan Mensual / Anual] -->|Paquete de Features incluidas + Límites| TF_PLAN[Features del Plan Base]
        ADD[Add-ons Extras Pagos] -->|Features adicionales| TF_ADD[Features Add-on]
    end

    subgraph "NIVEL 2: Tenant & Suscripción (Comercio)"
        TF_PLAN & TF_ADD -->|Activan en BD| T_FEAT[TenantFeatures: Pool Activo del Local]
        T_SUB[Estado Suscripción: ACTIVE | TRIAL | PAST_DUE | CANCELED] -->|Bloquea/Permite acceso| T_ACC[Acceso al Backoffice]
    end

    subgraph "NIVEL 3: Dueño ➡️ Empleados (Operación Interna)"
        T_FEAT -->|Solo delega features activas| TU[TenantUser: Membresía & Permisos]
        TU --> ROLE[Puesto/Rol: Smart Presets por Rubro]
        TU --> PERMS[Permisos Granulares: Submódulos Asignados]
    end
```

---

## 💳 2. Planes, Membresías y Suscripciones de Tenants

Los comercios pagan un abono recurrente (mensual/anual). Cada plan empaqueta un conjunto de módulos y límites, con la posibilidad de contratar add-ons extras.

### ⏳ Lo que resta por hacer (Planes & Suscripciones)
- [ ] **Modelo de Datos de Planes (`Plan` & `Subscription` en Prisma):**
  - Entidad `Plan`:
    - `name` (ej: *"Gastronomía Pro"*, *"Barbería Starter"*, *"Stock Básico"*).
    - `slug` (identificador único).
    - `vertical` (rubro al que aplica o `all`).
    - `priceMonthlyCents` y `currency` (ej: `ARS`, `USD`).
    - `includedFeatures: string[]` (lista de `featureKeys` activadas automáticamente).
    - `limits: Json` (máx. empleados, máx. productos, sucursales).
    - `isActive: boolean`.
  - Campos de Suscripción en `Tenant` o entidad `TenantSubscription`:
    - `planId` (Plan contratado).
    - `status` (`TRIAL`, `ACTIVE`, `PAST_DUE`, `CANCELED`).
    - `billingCycle` (`MONTHLY`, `ANNUAL`).
    - `currentPeriodStart` y `currentPeriodEnd` (control de vencimiento del mes).
    - `extraAddons: string[]` (módulos extras fuera del plan base).
- [ ] **Panel Superadmin: Gestión Integral de Planes (`/api/superadmin/plans` & `/superadmin/plans`):**
  - **Crear y Editar Planes:** Modificar nombre, precio mensual/anual, moneda, límites de uso y estado activo.
  - **Asignación Dinámica de Módulos al Plan:** Selector con checkboxes para agregar o quitar módulos (`includedFeatures: string[]`) de un plan en cualquier momento.
  - **Propagación & Sincronización:** Posibilidad de elegir si al modificar los módulos de un plan se actualizan automáticamente todos los comercios ya suscritos o si aplica solo a futuras altas.
  - **Catálogo de Módulos Globales:** Registro maestro de features disponibles en el ecosistema (`catalog`, `tables`, `kitchen_display`, `appointments`, `pos_cashier`, `inventory`, `delivery`, `analytics`, etc.).
- [ ] **Asignación de Plan al Crear/Editar Tenant:**
  - Al dar de alta o editar un comercio desde Superadmin, se selecciona su Plan base y se activan en lote todas las `TenantFeature` incluidas, permitiendo añadir add-ons adicionales si el cliente contrató módulos extra.
- [ ] **Guard de Estado de Suscripción (`SubscriptionGuard`):**
  - Si el abono mensual está vencido (`PAST_DUE` o `CANCELED`), se muestra un banner de pago pendiente o se restringe la operativa al modo solo lectura.
- [ ] **Pantalla de Mi Suscripción / Plan para el Dueño (`/settings/billing`):**
  - Vista donde el cliente ve:
    - Plan actual contratado y fecha del próximo cobro.
    - Módulos incluidos y estado activo.
    - Opciones de Upgrade / Add-ons disponibles.

---

## 🏢 3. Gestión de Tenants (Comercios)

### ✅ Lo que ya está hecho
| Componente | Capa | Detalle de Implementación |
| :--- | :--- | :--- |
| **Modelo Tenant en BD** | Backend (`Prisma`) | Entidad `Tenant` con `slug`, `name`, `vertical`, `isActive`, `settings` JSON y relaciones en cascada. |
| **FBAC Nivel 1 (`TenantFeature`)** | Backend (`Prisma`) | Entidad `TenantFeature` con clave única por tenant (`tenantId`, `featureKey`, `isEnabled`). |
| **CRUD Superadmin de Tenants** | Backend (`NestJS`) | Endpoints `/api/superadmin/tenants` (`GET`, `POST`, `PATCH`, `DELETE`). |
| **Asignación de Módulos (FBAC)** | Backend (`NestJS`) | Endpoints `/api/superadmin/tenants/:id/features` (`POST`, `PUT` batch). |
| **Borrado Seguro en Cascada** | Backend (`NestJS`) | Eliminación atómica del tenant, sus membresías, catálogo y features asociadas. |
| **Panel de Comercios Superadmin** | Frontend (`React`) | Vista `SuperadminTenantsPage.tsx` con listado, filtros por rubro/vertical, métricas y búsqueda en vivo. |
| **Modales de Gestión** | Frontend (`React`) | Modales para Alta de Comercio, Edición de Datos, Asignación de Módulos y Confirmación de Borrado. |
| **Invitación Automática al Dueño** | Backend + Frontend | Al crear un comercio se genera un código de invitación `AUR-XXXXX` con rol `OWNER` para el dueño del local. |
| **Contexto de Tenant Activo** | Frontend (`Zustand`) | Store `useTenantStore` que persiste el `activeTenantId` e inyecta el header `x-tenant-id` en cada petición API. |

### ⏳ Lo que resta por hacer (Tenants)
- [ ] **Configuración de Datos del Local por el Dueño (Settings):**
  - Pantalla en el Backoffice del comercio (`/settings/tenant`) para que el dueño edite logo, portada, horarios de atención, teléfonos de contacto y enlaces de redes sociales.
- [ ] **Switch de Comercios en Topbar:**
  - Selector desplegable en la barra superior para usuarios que sean dueños o empleados de más de 1 comercio simultáneamente.
- [ ] **Módulo de Métricas Básicas por Tenant:**
  - Resumen en el Dashboard del comercio sobre estado de su plan, cantidad de empleados activos y módulos contratados.

---

## 👥 4. Gestión de Empleados y Equipo (Roles & Permisos)

### ✅ Lo que ya está hecho
| Componente | Capa | Detalle de Implementación |
| :--- | :--- | :--- |
| **Modelo Membresía (`TenantUser`)** | Backend (`Prisma`) | Relación M:N entre `User` y `Tenant` con campos `role` (`SUPERADMIN`, `OWNER`, `MANAGER`, `STAFF`, `CASHIER`), `permissions: string[]` y `isActive`. |
| **Sistema de Invitaciones (`Invitation`)** | Backend (`NestJS`) | Endpoints `/api/invitations` para crear códigos `AUR-XXXXX` asociados a un `email`, `role`, `tenantId` y expiración en días. |
| **Registro Validado por Código** | Backend (`NestJS`) | `POST /api/auth/register` valida el código, crea la cuenta y genera la membresía `TenantUser` automáticamente. |
| **Pantalla Base de Equipo** | Frontend (`React`) | Componente `MembersPage.tsx` con listado visual de colaboradores y badges de rol. |
| **Pantalla de Invitaciones** | Frontend (`React`) | Componente `InvitationsPage.tsx` con generador de códigos, copiado de enlace directo `?code=...` y compartir vía WhatsApp/Email. |

### ⏳ Lo que resta por hacer (Empleados & Permisos)
- [ ] **Diccionario Centralizado de Presets por Rubro (`presets.config.ts`):**
  - Configuración declarativa sin `if/else`:
    - **Gastronomía:** Mozo (`tables.view`, `orders.create`), Cocinero (`kitchen.view`), Cajero (`pos.cashier`), Encargado (`all`).
    - **Belleza / Estética:** Barbero / Estilista (`appointments.self`, `clients.view`), Recepción (`appointments.all`, `pos.cashier`), Encargado (`all`).
    - **Pastelería / Retail:** Vendedor (`catalog.view`, `pos.cashier`), Pastelero / Depósito (`inventory.manage`), Encargado (`all`).
- [ ] **Modal Inteligente de Invitación de Empleados:**
  - Formulario en `MembersPage.tsx` donde el dueño ingresa el email, elige un rol sugerido con 1 clic y, opcionalmente, despliega un acordeón para personalizar permisos específicos.
- [ ] **Guard de Permisos en Backend (`PermissionsGuard`):**
  - Decorador `@RequirePermissions('tables.view', ...)` en NestJS que valide que:
    1. La feature madre esté activa en el tenant (`TenantFeature.isEnabled === true`).
    2. El usuario tenga el permiso en su arreglo `TenantUser.permissions` o sea `OWNER`/`SUPERADMIN`.
- [ ] **Navegación Dinámica en Frontend (Data-Driven Sidebar):**
  - Configurar `NAV_ITEMS` declarativos para que el menú lateral se filtre automáticamente mostrando solo los módulos y submódulos para los que el empleado tiene permisos.
- [ ] **Acciones de Gestión de Empleados:**
  - Modificar rol/permisos de un empleado existente sin tener que re-invitarlo.
  - Activar / Suspender acceso de un empleado (`TenantUser.isActive`).
  - Remover empleado del comercio.
- [ ] **Conexión de Rutas en `App.tsx` y `Sidebar.tsx`:**
  - Habilitar los accesos de `/members` e `/invitations` en la barra de navegación del Backoffice para los roles con permisos de administración.
