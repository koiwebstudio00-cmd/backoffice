# Módulo Finanzas

Última actualización: 29 de junio de 2026.

## Alcance implementado

El módulo administra movimientos de caja sin convertir ni sumar monedas diferentes.

- Monedas admitidas: `ARS`, `USD` y `USDT`.
- Tipos de movimiento: ingreso y egreso.
- Estados: pendiente, realizado y cancelado.
- Asociación opcional con cliente y proyecto.
- Fechas operativa, de vencimiento y de cobro o pago.
- Categoría, concepto y notas.
- CRUD completo con confirmación antes de eliminar.
- Búsqueda y filtros por tipo, estado y moneda.
- Caja realizada, ingresos, egresos, cuentas por cobrar y cuentas por pagar separados por moneda.
- Listado de vencimientos atrasados.
- Resultado realizado por proyecto y moneda.

## Modelo de datos

La migración `supabase/migrations/20260629200357_finance_module.sql` crea:

- Enumeraciones `financial_movement_type` y `financial_movement_status`.
- Tabla `financial_movements` con importes `numeric(20, 8)` para conservar precisión en USDT.
- Restricción de moneda a `ARS`, `USD` o `USDT`.
- Restricción que exige fecha de cobro o pago para movimientos realizados.
- Trigger que garantiza que el cliente del movimiento coincida con el cliente del proyecto asociado.
- Índices para moneda/fecha, vencimientos pendientes, clientes, proyectos y autor.
- Triggers de `updated_at` y preservación de `created_by`.
- Políticas RLS de lectura, creación, edición y eliminación exclusivas para `owner`.
- `GRANT` explícito para exponer la tabla al rol `authenticated`; RLS sigue determinando qué filas son accesibles.

La misma migración amplía `project_financials` para permitir presupuestos en USDT.

## Permisos

- `owner`: acceso completo al módulo y sus operaciones.
- `member`: el módulo no aparece en la navegación, la pantalla informa acceso restringido si se ingresa por URL y RLS impide el acceso a datos.

## Archivos principales

- `src/pages/FinancePage.tsx`
- `src/data/repository.ts`
- `src/lib/database.types.ts`
- `src/lib/format.ts`
- `src/App.tsx`
- `supabase/migrations/20260629200357_finance_module.sql`

## Verificación

Completado:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `git diff --check`
- Revisión de buenas prácticas de React y accesibilidad básica.
- Revisión estática de RLS, privilegios, índices, constraints y triggers.

Pendiente por acceso externo:

- Aplicar la migración al proyecto remoto `zilefjxgffazvuwbjypg`.
- Ejecutar una prueba CRUD autenticada y los advisors de seguridad/rendimiento después del despliegue.

El MCP conectado no posee permisos sobre ese proyecto y el entorno no permite iniciar PostgreSQL local, por lo que la migración no se considera desplegada todavía.
