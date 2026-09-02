# 🗺️ Roadmap de Desarrollo y Arquitectura por Fases
### Ecosistema Aurea Backoffice (`backoffice-be-aurea` & `backoffice-fe-aurea`)

Este documento establece la visión estratégica, el modelo de control de acceso en doble nivel (Plataforma vs. Negocio) y el desglose de **Fases de Desarrollo** para la plataforma Aurea.

---

## 🏛️ 1. Arquitectura de 2 Niveles: Planes, Features y Permisos de Empleados

Para que cada negocio pueda gestionarse de forma autónoma pero dentro de los límites de su suscripción, Aurea implementa un modelo de autorización jerárquico de 2 niveles:

```mermaid
graph TD
    subgraph "NIVEL 1: Plataforma Superadmin -> Tenant (FBAC Comercial)"
        P[Plan Contratado / Add-ons Pagos] -->|Habilita en BD| TF[TenantFeatures Pool de Features del Comercio]
        note1["Ejemplo Gastronómico:<br/>• catalog (Menú)<br/>• tables (Gestión Mesas)<br/>• orders (Comandas)<br/>• kitchen (Pantalla Cocina)<br/>• delivery (Delivery Propio)"]
    end

    subgraph "NIVEL 2: Dueño Tenant -> Empleados (RBAC + Permisos Granulares)"
        TF -->|Solo puede delegar features activas| TU[TenantUser: Membresía & Permisos]
        TU --> R[Rol Base: OWNER | MANAGER | STAFF | CASHIER]
        TU --> PERMS[Permissions: Submódulos y Vistas Asignadas]
        note2["Ejemplos Empleados:<br/>• Mozo: tables.view, orders.create<br/>• Cocinero: kitchen.view, kitchen.update<br/>• Cajero: orders.cashier, reports.daily<br/>• Encargado: catalog.edit, members.view"]
    end
```

### Nivel 1: Plataforma / Superadmin ➡️ Tenant (Suscripción y Módulos)
- **Modelo:** `TenantFeature` (`tenantId`, `featureKey`, `isEnabled`).
- **Lógica:** El comercio (Tenant) paga un plan base según su rubro (Gastronomía, Belleza, Stock, etc.) más posibles add-ons extras.
- **Resultado:** Se activa el catálogo de capacidades que el software ofrece a ese comercio en particular.

### Nivel 2: Tenant (Owner/Manager) ➡️ Empleados / Equipo (Operación Interna)
- **Modelo:** `TenantUser` (`tenantId`, `userId`, `role`, `permissions: string[]`).
- **Lógica:** El dueño del comercio invita a sus empleados y define:
  1. **Rol Funcional:** Jerarquía y alcance general (`OWNER`, `MANAGER`, `STAFF`, `CASHIER`).
  2. **Permisos / Vistas Internas:** Qué pantallas, submódulos o acciones puede ejecutar cada empleado dentro del local (ej: mozo sólo ve comandas y mesas; cocinero sólo ve pantalla de comandas de cocina; encargado puede editar precios y stock).
- **Regla de Integridad:** Un empleado nunca puede tener acceso a un permiso cuya feature madre no esté activa a nivel Tenant (Nivel 1).

---

## 🚀 2. Fases de Desarrollo

### 🟢 FASE 1: Fundación Core, Autenticación, Superadmin & Gestión Base de Tenants
> **Estado:** ✅ **COMPLETADA**
- [x] Motor de autenticación dual (JWT en memoria + Refresh Token en Cookie `HttpOnly`).
- [x] Silent refresh automático e interceptores Axios en Frontend.
- [x] Acceso con Google OAuth2 (`passport-google-oauth20` + redirección).
- [x] Flujo de Magic Links y Recuperación de contraseña.
- [x] Sistema de Invitaciones cerradas con código alfanumérico (`AUR-XXXXX`).
- [x] Panel de Superadmin para creación y administración de Comercios (Tenants).
- [x] Asignación de Features por Tenant (FBAC Nivel 1) desde el Superadmin.
- [x] Eliminación segura en cascada de comercios (`onDelete: Cascade` y limpieza relacional).
- [x] Dashboard base y switch interactivo de comercios.

---

### 🟡 FASE 2: Gestión de Equipo del Tenant & Control de Acceso Granular de Empleados
> **Estado:** 🎯 **PRÓXIMA FASE (En Curso)**
- [ ] Conectar la vista de **Equipo y Colaboradores** (`MembersPage.tsx`) en la navegación del comercio.
- [ ] Extender el modal de invitación de empleados dentro del tenant:
  - Selección de Rol (`MANAGER`, `STAFF`, `CASHIER`).
  - Checkboxes para asignar permisos y submódulos específicos según las features activas del local.
- [ ] Guard y Decorador en Backend `@RequirePermissions('tables.view', 'catalog.edit')` que valide contra `TenantUser.permissions`.
- [ ] Filtrado dinámico del Sidebar del empleado en Frontend para mostrar solo las opciones para las que tiene permisos.
- [ ] Perfil del empleado y configuración de preferencias individuales.

---

### 🔵 FASE 3: Catálogo Universal, Categorías, Modificadores & Variantes
> **Objetivo:** Permitir a cualquier tipo de comercio cargar sus productos o servicios.
- [x] Catálogo base de productos y servicios con precio, duración, imagen y metadatos.
- [x] CRUD de Categorías y Subcategorías jerárquicas.
- [ ] Modelo de Items de Catálogo enriquecido:
  - Modo Producto Físico (artículos, precios, costo, SKU, stock inicial).
  - Modo Servicio / Turno (duración en minutos, precio, profesional asignado).
- [x] Grupos de Opciones / Modificadores (ej: puntos de cocción, agregados, salsas, talles, colores).
- [ ] Carga masiva / Importación de productos vía CSV / Excel.
- [ ] Carga y optimización de imágenes multimedia por producto.

---

### 🟣 FASE 4: Módulos Operativos Verticales (Gastronomía, Turnos, Stock)
> **Objetivo:** Dotar a cada rubro de su herramienta de trabajo diaria.

#### Vertical Gastronómica:
- [x] **Gestión de Salón & Mesas (`tables`):** Modelo, API de estados y pantalla operativa inicial.
- [x] **Pedidos base:** Modelo de pedidos/líneas, validación de catálogo y estados de preparación.
- [x] **Comandera / KDS Pantalla de Cocina (`kitchen`):** Vista operativa con comandas, estados de preparación/despacho y refresco periódico.
- [ ] **Reservas de Mesa (`bookings`):** Agenda de comensales y confirmaciones.

#### Vertical Belleza / Salud / Servicios:
- [x] **Agenda de Turnos & Citas (`appointments`):** Reservas persistentes, disponibilidad, solapamientos y confirmación/cancelación.
- [x] **Ficha de Clientes / Historial (`clients`):** Registro de clientes, contacto, historial de turnos y notas de atención.

#### Vertical Pastelería / Retail / Stock:
- [x] **Control de Stock base (`inventory`):** Artículos, ajustes y movimientos persistentes.
- [x] **Alertas de Stock Mínimo** en la vista de inventario.

---

### 🟠 FASE 5: Punto de Venta (POS / Caja), Pedidos, Cobros y Delivery
> **Objetivo:** Cobrar, emitir tickets y procesar pedidos multicanal.
- [x] **Módulo POS / Caja Diaria:** Apertura y cierre de caja, arqueo en efectivo y medios digitales.
- [x] **Flujo de Comandas & Facturación:** Adición de productos a una mesa/pedido y estados de cobro; división de cuentas y ticket fiscal quedan pendientes.
- [x] **Módulo de Delivery & Takeaway:** Canales takeaway/delivery y estado de entrega; logística con cadete queda pendiente.
- [ ] Integración con pasarelas de pago (Mercado Pago QR / Checkout, Stripe).

---

### 🔴 FASE 6: Integración con Portal Público (Aurea Pages Template) & Menú QR
> **Objetivo:** Conectar el backoffice con la web pública del cliente.
- [x] Sincronización de catálogo y envío de pedidos desde la plantilla pública; disponibilidad en tiempo real queda pendiente.
- [ ] Generador de Códigos QR para mesas (abre el menú digital interactivo).
- [ ] Pedidos directos desde el celular del comensale / cliente (Self-Ordering).
- [ ] Personalización del Theme y Branding del local desde el Backoffice (colores, logo, tipografía, portada).

---

### ⚪ FASE 7: Analytics, Notificaciones Automáticas & Marketing
> **Objetivo:** Inteligencia de negocio y retención de clientes.
- [ ] Dashboard de Analíticas Avanzadas: Productos más vendidos, horas pico, ticket promedio, facturación diaria/mensual.
- [ ] Módulo de Email Transaccional / Notificaciones por WhatsApp (confirmación de reservas, turnos, pedidos).
- [ ] Programa de Fidelidad / Descuentos y Cupones promocionales.
