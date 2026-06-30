# Plan — Ficha de cliente centralizada

Última actualización: 29 de junio de 2026.

## Objetivo

Cada cliente tiene su propia pantalla donde se ve y se gestiona **toda** su información en un solo lugar: datos de contacto, proyectos, pagos, tareas, notas y (más adelante) credenciales. Hoy esa información está dispersa entre las pestañas globales de Clientes, Proyectos y Finanzas; la ficha la unifica sin eliminar esas vistas globales.

## Decisiones tomadas

- **Credenciales:** se posponen a una fase posterior. La ficha muestra la sección con un estado "próximamente"; la Bóveda cifrada (Opción A de `project.md`) va en su propio incremento.
- **Notas:** feed con fecha y autor (varias notas por cliente y por proyecto). Tabla nueva `notes`.
- **Navegación:** se mantienen las pestañas globales (Proyectos, Finanzas) para la vista agregada entre clientes; la ficha agrega la vista centralizada por cliente.

## Modelo de datos en uso

Lo que ya existe y de lo que cuelga la ficha:

- `clients` — ficha base (contacto, estado, `notes` como texto libre actual).
- `projects` + `project_financials` — proyectos del cliente (`client_id`).
- `tasks` — cuelgan de `projects`, **no** de `clients`. Las tareas de un cliente se obtienen cruzando por sus proyectos.
- `financial_movements` — pagos/egresos, con `client_id` y `project_id` opcionales (owner-only por RLS).

Lo único que falta a nivel de base para este plan es la tabla de notas.

---

## Fase 0 — Preparación

Trabajo base reutilizable antes de la ficha.

1. **Componente `Tabs`** (`src/components/ui/tabs.tsx`): la ficha se organiza en pestañas internas (Resumen, Proyectos, Pagos, Tareas, Notas, Credenciales). Se agrega el componente shadcn/ui sobre `radix-ui`, que ya es dependencia.
2. **Migración `notes`** (`supabase/migrations/<timestamp>_notes.sql`):

   ```
   notes
     id            uuid pk
     client_id     uuid not null  → clients(id) on delete cascade
     project_id    uuid null      → projects(id) on delete cascade
     body          text not null  (1..4000)
     created_by    uuid not null default auth.uid() → auth.users(id)
     created_at    timestamptz
     updated_at    timestamptz
   ```

   - Índices: `(client_id, created_at desc)` y `(project_id)` parcial.
   - Triggers existentes reutilizados: `set_updated_at` y `preserve_created_by`.
   - RLS: todo el equipo lee y crea (las notas son operativas, no financieras); **editar/eliminar** queda restringido al autor de la nota o a `owner`. `created_by` se fuerza a `auth.uid()` en el insert.
   - Decisión sobre `clients.notes` (campo actual): se conserva como "perfil/descripción" corta del cliente en la pestaña Resumen; el feed de notas es adicional. No se migra ni se pierde nada.

## Fase 1 — Ficha de cliente (lectura + notas)

El esqueleto navegable con todos los datos del cliente visibles.

3. **Ruta** `clientes/:clientId` → `ClientDetailPage` (lazy, dentro de `AppLayout` y `ProtectedRoute`). Las filas de `ClientsPage` linkean a la ficha (click en la fila o acción "Ver ficha").
4. **Repository** (`src/data/repository.ts`), funciones nuevas scopeadas por cliente:
   - `getClient(clientId)` — ficha del cliente.
   - `listProjectsByClient(clientId)` — reutiliza el shape de `listProjects` con filtro.
   - `listTasksByClient(clientId)` — cruza `tasks → projects!inner(client_id)` filtrando por el cliente.
   - `listMovementsByClient(clientId)` — reutiliza `listFinancialMovements` filtrado (owner-only; RLS ya lo protege).
   - `listNotes({ clientId })`, `createNote`, `updateNote`, `deleteNote`.
5. **`ClientDetailPage`** con:
   - **Encabezado:** identidad, estado, contacto, acciones (editar/eliminar cliente reutilizando el form existente).
   - **KPIs:** proyectos activos, progreso promedio, por cobrar / por pagar (solo owner), próxima fecha relevante.
   - **Pestañas:**
     - *Resumen:* datos de contacto + perfil (`clients.notes`) + últimos movimientos y próximos vencimientos.
     - *Proyectos:* lista de proyectos del cliente con progreso; link al proyecto en la pestaña global.
     - *Pagos* (owner): movimientos del cliente con totales por moneda; link a Finanzas.
     - *Tareas:* tareas abiertas agrupadas por estado, a través de todos sus proyectos.
     - *Notas:* feed funcional completo (crear/editar/eliminar) desde el día uno, por ser autocontenido.
     - *Credenciales* (owner): placeholder "próximamente".
   - **Permisos:** las pestañas Pagos y Credenciales no se muestran a `member`; RLS hace cumplir el acceso real aunque entren por URL.
   - Estados de carga (skeletons) y error por pestaña, siguiendo el patrón ya usado en las páginas actuales.

Al cierre de Fase 1 la ficha ya centraliza **toda** la información del cliente en lectura, con notas totalmente operativas. Proyectos, pagos y tareas se siguen creando/editando desde las pestañas globales por ahora.

## Fase 2 — Edición embebida desde la ficha

Para no rebotar a las pestañas globales.

6. **Extraer diálogos reutilizables** desde `ProjectsPage` y `FinancePage`:
   - `ProjectFormDialog` y `MovementFormDialog` como componentes compartidos.
   - Las páginas globales y la ficha los consumen igual.
7. **Pre-cargar el cliente** al crear un proyecto o un movimiento desde la ficha (cliente fijado, no editable).
8. **Tareas:** alta/edición de tareas desde la pestaña Tareas, eligiendo a qué proyecto del cliente pertenecen.

## Fase 3 — Credenciales (su propio incremento)

9. Implementar la Bóveda cifrada según `project.md` §3.3 (AES-256-GCM en Edge Functions, reveal gate, log de accesos) y enchufarla en la pestaña Credenciales de la ficha, scopeada por `client_id`. Queda fuera de este plan inmediato por decisión tomada.

---

## Orden de entrega sugerido

1. Fase 0 (Tabs + migración `notes`).
2. Fase 1 (ruta, repository, ficha en lectura + notas).
3. Fase 2 (edición embebida).
4. Fase 3 (credenciales, después).

Cada fase es desplegable de forma independiente: al terminar la Fase 1 ya tenés la pantalla centralizada usable.

## Verificación por fase

- `npm run typecheck`, `npm run lint`, `npm run build`.
- Revisión de RLS de `notes` (lectura de equipo, edición de autor/owner) y de que Pagos/Credenciales no se filtren a `member`.
- Prueba manual con el cliente real ya cargado (el SaaS mensual): que su proyecto, sus pagos y sus tareas aparezcan correctamente cruzados en la ficha.

## Fuera de alcance (a registrar para después)

- Asignación de tareas a personas (scrum con responsables): hoy `tasks` no tiene `assignee`. Si más adelante suman `member`s, conviene agregarlo.
- Consolidación multi-moneda (campo `amount_base` con cotización) para ver rentabilidad del cliente en una sola moneda.
