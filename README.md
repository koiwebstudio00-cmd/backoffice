# Koi Office

Back office interno de la agencia KOI: un solo lugar para gestionar clientes, proyectos y su progreso, finanzas multi-moneda, calendario y una bóveda cifrada de credenciales.

Sistema **single-tenant de uso interno**, operado hoy por los dos founders (rol `owner`) y preparado para sumar colaboradores (rol `member`) sin rehacer la base.

## Módulos

- **Clientes (CRM liviano):** ficha por cliente con contacto, estado (`lead`, `active`, `paused`, `closed`), notas y acceso a todo lo relacionado (proyectos, pagos, tareas, credenciales) desde `clientes/:clientId`.
- **Proyectos:** pertenecen a un cliente o son internos del estudio. Kanban de tareas (`todo`, `doing`, `review`, `done`) con progreso derivado de tareas completadas, hitos con fecha, presupuesto (solo `owner`) y página de detalle en `proyectos/:projectId`.
- **Finanzas (solo `owner`):** ingresos y egresos en ARS, USD y USDT con totales separados por moneda (nunca se mezclan). Estados pendiente/realizado/cancelado, cuentas por cobrar y pagar, vencimientos atrasados, resultado realizado por proyecto y pagos mensuales recurrentes autogenerados.
- **Calendario:** reuniones propias (muchos-a-muchos con proyectos) unificadas con deadlines, hitos, vencimientos de pagos y tareas en vistas día/semana/mes. Zona horaria de Argentina. Sincronización con Google Calendar planificada como incremento.
- **Bóveda de credenciales (solo `owner`):** contraseñas cifradas del lado servidor con AES-256-GCM dentro de Edge Functions. La base solo guarda ciphertext + IV; la llave maestra vive como secret de Supabase. Reveal gate con re-validación de contraseña (ventana de 5 minutos) y log de accesos.
- **Notas:** feed con fecha y autor a nivel cliente o proyecto; edición y borrado solo para el autor o un `owner`.
- **Variables de entorno (solo `owner`):** archivos `.env` por proyecto cifrados como blob (mismo modelo que la bóveda), con reveal gate y log de accesos.
- **Features:** pedidos internos de mejoras al sistema con estados gestionados por `owner` y comentarios del equipo.
- **Dashboard:** métricas reales de clientes, proyectos, tareas y agenda del día.

## Stack

- **Frontend:** React 19, Vite, TypeScript estricto, Tailwind CSS 4, shadcn/ui, React Router 7. Identidad visual sobre el naranja `#F97415`, temas claro/oscuro/automático.
- **Backend:** Supabase — Postgres, Auth, Row Level Security, Storage y Edge Functions (`save-credential`, `reveal-credential`).
- **Autorización:** roles `owner` y `member` en `profiles`. La UI refleja permisos, pero la autorización real la aplica RLS en la base.

## Estructura del repo

```
src/
  auth/         AuthProvider, ProtectedRoute, contexto de sesión
  components/   ui/ (shadcn) y forms/ (diálogos reutilizables de alta/edición)
  data/         repository.ts — todas las lecturas/escrituras a Supabase
  layout/       AppLayout y navegación por rol
  lib/          cliente supabase, tipos de base, formato, calendario, errores
  pages/        una página por módulo + fichas de cliente y proyecto
supabase/
  migrations/   esquema versionado (8 migraciones aplicadas)
  functions/    Edge Functions de la bóveda
docs/           PRD, historias de usuario, system design y docs de módulos
```

## Ejecutar localmente

```bash
npm install
cp .env.example .env.local   # completar con las claves reales
npm run dev
```

Variables esperadas en `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

Sin variables reales de Supabase el acceso queda deshabilitado, para evitar trabajar con datos ficticios. La clave `service_role` nunca va en variables `VITE_*` ni al navegador.

## Configurar Supabase

Después de vincular el proyecto remoto, aplicar las migraciones (`supabase db push`) y crear los usuarios desde Supabase Auth. Los perfiles se crean con rol `member`; la promoción inicial se hace por SQL:

```sql
update public.profiles set role = 'owner' where id = '<auth-user-uuid>';
```

En producción: deshabilitar el registro público, crear miembros por invitación y mantener MFA en las cuentas de Supabase de los founders (defensa principal de la bóveda). El despliegue de la bóveda (llave maestra y Edge Functions) está en [`docs/vault-setup.md`](docs/vault-setup.md).

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm run build
```

La base local completa requiere Docker para `supabase start`.

## Documentación

- [`docs/prd.md`](docs/prd.md) — PRD del MVP y roadmap.
- [`docs/historias-de-usuario.md`](docs/historias-de-usuario.md) — historias con criterios de aceptación.
- [`docs/system-design.md`](docs/system-design.md) — arquitectura, datos y seguridad.
- [`docs/progreso-proyecto.md`](docs/progreso-proyecto.md) — estado de avance detallado.
- [`docs/crud-modules.md`](docs/crud-modules.md) — operaciones, permisos y validaciones por módulo.
- [`docs/finance-module.md`](docs/finance-module.md) — módulo Finanzas.
- [`docs/vault-setup.md`](docs/vault-setup.md) — despliegue de la bóveda.
- [`project.md`](project.md) — especificación técnica original.
- [`AGENTS.md`](AGENTS.md) / [`CLAUDE.md`](CLAUDE.md) — guía para agentes de código.
