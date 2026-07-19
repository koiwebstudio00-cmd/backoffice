# PRD — Koi Office (MVP)

Versión 1.0 · Julio 2026 · Estado: **MVP implementado y desplegado**

Este PRD documenta el producto tal como está construido (as-built) y define el roadmap de incrementos.

---

## 1. Contexto y problema

KOI es una agencia de software de dos founders que desarrolla webs, agentes de IA y mantenimientos para clientes, además de SaaS propios. La operación estaba repartida entre planillas, notas sueltas, el calendario personal y gestores de contraseñas ad hoc. Consecuencias:

- No había una vista única de qué proyecto deja plata y cuál trabaja a pérdida.
- Las cuotas por cobrar se seguían de memoria; los vencimientos se pasaban.
- Las credenciales de clientes circulaban por canales inseguros.
- El estado real de cada proyecto dependía de preguntarle al otro founder.

## 2. Objetivo del producto

Un back office interno único donde ambos founders gestionan clientes, proyectos y su progreso, las finanzas de la agencia, la agenda y las credenciales de clientes — con seguridad real (RLS + cifrado) y preparado para sumar colaboradores sin acceso a datos sensibles.

## 3. Usuarios y roles

| Rol | Quién | Acceso |
|---|---|---|
| `owner` | Los dos founders | Total: incluye finanzas, presupuestos, bóveda y eliminaciones |
| `member` | Futuros colaboradores | Clientes, proyectos, tareas, notas y calendario; sin finanzas, presupuestos ni credenciales; sin eliminar |

Principio: transparencia operativa para todo el equipo; datos sensibles (dinero y credenciales) solo `owner`. La UI refleja permisos, pero la autorización se aplica en la base con RLS.

## 4. Alcance del MVP (implementado)

### 4.1 Autenticación y permisos
- Login con Supabase Auth, rutas privadas, perfil automático por usuario.
- Roles `owner`/`member`; navegación y acciones adaptadas al rol.

### 4.2 Clientes
- CRUD con búsqueda y filtro por estado (`lead`, `active`, `paused`, `closed`).
- Ficha por cliente (`clientes/:clientId`) con métricas y pestañas: Resumen, Proyectos, Pagos (owner), Tareas, Notas y Credenciales (owner). Edición embebida con el cliente pre-cargado.
- Eliminación solo `owner`; bloqueada si el cliente tiene proyectos.

### 4.3 Proyectos y tareas
- Proyectos de cliente o internos del estudio (sin cliente).
- Tipo, estado, fechas, presupuesto y moneda (presupuesto solo `owner`).
- Kanban de tareas (`todo`, `doing`, `review`, `done`); % de avance derivado de tareas completadas, nunca almacenado.
- Hitos con fecha por etapa; los vencidos pendientes se destacan.
- Página de detalle (`proyectos/:projectId`) con pestañas Resumen, Tareas, Hitos, Pagos (owner), Notas y Credenciales.

### 4.4 Finanzas (solo `owner`)
- Movimientos de ingreso/egreso en ARS, USD y USDT; totales siempre separados por moneda.
- Estados pendiente/realizado/cancelado; un movimiento realizado exige fecha de cobro o pago.
- Caja realizada, cuentas por cobrar/pagar, vencimientos atrasados y resultado realizado por proyecto.
- Pagos mensuales recurrentes: el sistema mantiene generado el próximo mes pendiente; cada mes es un registro independiente.
- Vínculo opcional con cliente y proyecto (validado que coincidan).

### 4.5 Calendario (versión interna)
- Reuniones propias con relación muchos-a-muchos a proyectos.
- Vistas día/semana/mes que unifican reuniones, deadlines, hitos, vencimientos de pagos (owner) y de tareas.
- Agenda del día en el dashboard. Zona horaria de Argentina.

### 4.6 Bóveda de credenciales (solo `owner`)
- Cifrado del lado servidor (AES-256-GCM) en Edge Functions; la base solo guarda ciphertext + IV; llave maestra como secret de Supabase, versionada (`key_version`).
- Reveal gate: re-validación de contraseña (step-up auth) con ventana de 5 minutos; el secreto se muestra 30 segundos, con copiar, sin cachear.
- Todo reveal queda registrado en `credential_access_log`.

### 4.7 Notas
- Feed con fecha y autor a nivel cliente o proyecto; editar/eliminar solo autor u `owner`.

### 4.8 Dashboard
- Indicadores reales de clientes, proyectos, tareas, progreso y agenda del día.

## 5. Fuera de alcance del MVP

- Multi-tenant, facturación a terceros o acceso de clientes.
- Conversión/consolidación de monedas (los totales van separados).
- Sincronización con Google Calendar, invitaciones y recordatorios.
- Rotación automática de la llave maestra.
- Apps móviles nativas (la web es responsive).
- Time tracking y reportes exportables.

## 6. Requisitos no funcionales

- **Seguridad:** RLS en todas las tablas; secretos nunca en claro en la base ni en el bundle; `service_role` jamás en el frontend; MFA obligatorio en las cuentas de Supabase de los founders.
- **Integridad:** constraints y triggers en Postgres (fechas válidas, cliente-proyecto coincidentes, `ON DELETE RESTRICT` en clientes con proyectos, cascadas controladas).
- **Precisión monetaria:** `numeric(20,8)`; nunca se pierde moneda ni monto original.
- **Calidad:** TypeScript estricto, ESLint y build de producción como gate de cada cambio.
- **UX:** responsive, temas claro/oscuro/automático, rutas con carga diferida.

## 7. Métricas de éxito

- Los founders operan la agencia sin planillas paralelas (adopción total de finanzas y pagos).
- Cero cuotas vencidas sin detectar: todo vencimiento aparece en Finanzas y Calendario.
- Cero credenciales compartidas fuera de la bóveda.
- El estado de cualquier proyecto se responde desde su ficha sin preguntar.

## 8. Incremento 1.1 (aprobado, en documentación)

Tres módulos nuevos definidos en julio 2026. Detalle técnico en [`system-design.md`](system-design.md) §8 e historias HU-22 a HU-28.

### 8.1 Archivos .env por proyecto (solo `owner`)

Guardar el contenido de los archivos `.env` de cada proyecto con el mismo modelo de seguridad que la bóveda.

- Varios archivos por proyecto, identificados por nombre/entorno (ej.: `.env`, `.env.production`).
- El contenido completo se cifra como un solo blob (AES-256-GCM en Edge Function); la base solo guarda ciphertext + IV + `key_version`.
- Reveal gate idéntico al de credenciales: re-validación de contraseña, ventana de 5 minutos, sin caché, y registro de cada reveal.
- Acceso exclusivo de `owner` (UI + RLS).
- Nueva pestaña "Variables de entorno" en la página del proyecto.

### 8.2 Pedidos de features (todo el equipo)

Canal interno para proponer mejoras al propio sistema.

- Cualquier usuario autenticado crea pedidos con título y descripción, y comenta los existentes.
- Estados: `proposed` → `accepted` → `in_progress` → `done`, o `rejected`. Solo `owner` cambia el estado.
- El autor edita su pedido; eliminación solo `owner`.

### 8.3 Portal público de clientes

Página externa de solo lectura donde cada cliente ve el estado de su relación comercial con KOI.

- **Acceso por link privado con token**, sin login: URL secreta única por cliente, generada y revocable por `owner`. El token se guarda hasheado y cada acceso queda registrado.
- **Contenido:** sus proyectos con estado, % de avance e hitos; sus pagos hechos y futuros mostrando **solo fecha, método de pago, moneda y estado — nunca importes**; y sus notas completas.
- Requiere agregar el campo **método de pago** a los movimientos financieros (hoy no existe).
- Servido por una Edge Function que valida el token y devuelve un payload curado; el portal nunca consulta las tablas directamente.

> Riesgo asumido: cualquiera con el link ve el portal, y las notas del cliente se muestran completas. Mitigación: tokens revocables + log de accesos + disciplina del equipo al escribir notas.

## 9. Roadmap (post-MVP)

| Prioridad | Incremento | Descripción |
|---|---|---|
| 1 | Google Calendar | Sync bidireccional de reuniones (fuente de verdad: Google), invitaciones, Meet y recordatorios; espejo local con sync token |
| 2 | Consolidado multi-moneda | `amount_base` con cotización del día (definir oficial/MEP/blue); P&L consolidado derivable sin migración |
| 3 | Rotación de llave | Re-cifrado por lotes usando `key_version`, sin downtime |
| 4 | Optimización de bundle | Reducir el tamaño del bundle inicial (advertencia actual no bloqueante) |
| 5 | Onboarding de `member` | Flujo de invitación y prueba real del rol restringido |

## 10. Referencias

- Especificación técnica original: [`../project.md`](../project.md)
- Historias de usuario: [`historias-de-usuario.md`](historias-de-usuario.md)
- Diseño de sistema: [`system-design.md`](system-design.md)
- Estado de avance: [`progreso-proyecto.md`](progreso-proyecto.md)
