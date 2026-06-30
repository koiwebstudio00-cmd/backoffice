# Estado de operaciones CRUD

Este documento registra qué operaciones están terminadas, cómo se autorizan y qué validaciones relevantes tiene cada módulo.

## Clientes — completo

Operaciones disponibles:

- Crear una ficha con nombre, empresa, email, teléfono, estado y notas.
- Listar, buscar y filtrar clientes por estado.
- Editar todos los datos de una ficha existente.
- Eliminar clientes únicamente con rol `owner` y confirmación explícita.

Reglas y seguridad:

- Todos los miembros autenticados del equipo pueden crear, leer y editar.
- Solo el rol `owner` ve la acción de eliminar; PostgreSQL/RLS vuelve a aplicar esta regla en la base de datos.
- Un cliente con proyectos asociados no se elimina porque la relación usa `ON DELETE RESTRICT`. La UI explica cómo resolver ese caso.
- Las mutaciones solicitan la fila afectada con `select('id').single()` para no tratar como éxito una operación rechazada o que no encontró registros.
- Los textos opcionales vacíos se normalizan a `null`; el nombre es obligatorio y respeta el límite de 120 caracteres del esquema.

Archivos principales:

- `src/data/repository.ts`
- `src/pages/ClientsPage.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/lib/errors.ts`

Verificación realizada:

- `npm run typecheck`
- `npm run lint`

## Proyectos — completo

Operaciones disponibles:

- Crear proyectos y asociarlos a un cliente.
- Listar y seleccionar proyectos con su progreso calculado a partir de tareas.
- Editar cliente, nombre, tipo, estado y fechas.
- Crear o actualizar presupuesto y moneda cuando opera un usuario `owner`.
- Eliminar proyectos únicamente con rol `owner` y confirmación explícita.

Reglas y seguridad:

- Todos los miembros autenticados pueden crear, leer y editar los datos operativos.
- Los datos de `project_financials` solo se solicitan y muestran a usuarios `owner`; RLS aplica la misma restricción en la base.
- Un miembro puede crear o editar un proyecto sin que la aplicación intente escribir datos financieros.
- La fecha de entrega no puede ser anterior al inicio, validado por el formulario y por la restricción `project_dates_are_valid` de PostgreSQL.
- Al eliminar un proyecto, sus tareas y datos financieros se eliminan por las relaciones `ON DELETE CASCADE`.
- Las actualizaciones y eliminaciones comprueban que exista una fila afectada.

Archivos principales:

- `src/data/repository.ts`
- `src/pages/ProjectsPage.tsx`

Verificación realizada:

- `npm run typecheck`
- `npm run lint`

## Tareas — completo

Operaciones disponibles:

- Crear tareas dentro del proyecto seleccionado.
- Listarlas en un tablero agrupado por estado.
- Editar título, estado y fecha de vencimiento.
- Cambiar el estado directamente desde cada tarjeta.
- Eliminar tareas únicamente con rol `owner` y confirmación explícita.

Reglas y seguridad:

- Todos los miembros autenticados pueden crear, leer, editar y mover tareas.
- Solo `owner` ve la acción de eliminar; la política RLS también rechaza eliminaciones de otros roles.
- El título es obligatorio y respeta el máximo de 240 caracteres definido en PostgreSQL.
- Las fechas vacías se guardan como `null`.
- Las actualizaciones de estado, ediciones y eliminaciones comprueban que exista una fila afectada.

Archivos principales:

- `src/data/repository.ts`
- `src/pages/ProjectsPage.tsx`

Verificación realizada:

- `npm run typecheck`
- `npm run lint`

## Verificación integral

- TypeScript estricto: correcto.
- ESLint: correcto.
- Build de producción con Vite: correcto.
- Revisión de RLS: lectura, alta y edición para miembros; eliminación solo para `owner` en los tres módulos.
- Revisión de exposición Data API: la migración contiene `GRANT` explícitos para el rol `authenticated`.
- Integridad referencial: clientes protegidos con `ON DELETE RESTRICT`; dependencias de proyectos con `ON DELETE CASCADE`.

## Finanzas — implementación local completa, despliegue pendiente

Operaciones disponibles:

- Crear, listar, buscar, filtrar, editar y eliminar ingresos y egresos.
- Trabajar con ARS, USD y USDT sin mezclar totales.
- Asociar movimientos con clientes y proyectos.
- Controlar estados pendientes, realizados y cancelados.
- Consultar vencimientos y resultado realizado por proyecto.

Reglas y seguridad:

- Todo el módulo está restringido al rol `owner` en interfaz y RLS.
- Los importes se almacenan como `numeric(20, 8)`.
- Un movimiento realizado exige fecha de cobro o pago.
- El cliente debe coincidir con el proyecto asociado.
- La tabla incluye privilegios Data API explícitos e índices para los filtros principales.

Documentación detallada: [`finance-module.md`](finance-module.md).

Estado remoto:

- La migración está creada, pero falta aplicarla y ejecutar la prueba CRUD en el proyecto real porque el MCP actual no tiene permisos sobre ese proyecto.
