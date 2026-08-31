# 📋 Fases de Desarrollo: Gestión de Tenants y Empleados
### Aurea Backoffice (`backoffice-be-aurea` & `backoffice-fe-aurea`)

Este documento detalla el estado actual (**Lo que está hecho**) y el alcance pendiente (**Lo que resta por hacer**) exclusivamente para los módulos de **Gestión de Tenants (Comercios)** y **Gestión de Empleados / Equipo (Roles & Permisos)**.

---

## 🏛️ 1. Resumen de Arquitectura

El sistema opera bajo un modelo **Multi-Tenant jerárquico de 2 niveles**:
1. **Nivel 1 (Superadmin ➡️ Tenant):** Asignación de plan comercial y módulos habilitados (`TenantFeature`).
2. **Nivel 2 (Dueño/Manager ➡️ Empleados):** Asignación de puestos y permisos granulares (`TenantUser.permissions`) basados en *Smart Presets* por rubro (sin cascada de condicionales).

---

## 🏢 2. Gestión de Tenants (Comercios)

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

## 👥 3. Gestión de Empleados y Equipo (Roles & Permisos)

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
