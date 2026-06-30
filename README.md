# Koi Office

Back office interno para gestionar clientes, proyectos, tareas y, en los próximos incrementos, finanzas, calendario y credenciales.

## Estado actual

- React 19, Vite, Tailwind CSS 4 y TypeScript estricto.
- Sistema de componentes shadcn/ui con temas claro, oscuro y automático.
- Identidad visual basada en el naranja de marca `#F97415`.
- Login preparado para Supabase Auth.
- Dashboard conectado a datos reales de Supabase.
- CRUD completo de clientes, proyectos y tareas desde la aplicación.
- Módulo Finanzas implementado para ARS, USD y USDT; su migración remota está pendiente de aplicar.
- CRM con búsqueda y filtro por estado.
- Vista de proyectos con kanban y progreso derivado.
- Layout responsive con permisos visuales por rol.
- Migración inicial de Supabase con perfiles, roles, clientes, proyectos, tareas, presupuesto restringido y RLS.

La documentación del estado actual se encuentra en:

- [`docs/progreso-proyecto.md`](docs/progreso-proyecto.md): avance general y próximos módulos.
- [`docs/crud-modules.md`](docs/crud-modules.md): operaciones, permisos y validaciones por módulo.
- [`docs/finance-module.md`](docs/finance-module.md): alcance y estado de despliegue de Finanzas.

## Ejecutar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
```

Sin variables reales de Supabase, el acceso queda deshabilitado para evitar trabajar accidentalmente con datos ficticios.

## Configurar Supabase

La aplicación espera estas variables en `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
```

La clave `service_role` nunca debe añadirse a variables `VITE_*` ni enviarse al navegador.

La estructura local se encuentra en `supabase/`. Después de vincular un proyecto remoto, aplicar la migración inicial y crear los usuarios desde Supabase Auth. Los perfiles se crean automáticamente con rol `member`; la promoción inicial de cada founder se hace desde SQL:

```sql
update public.profiles
set role = 'owner'
where id = '<auth-user-uuid>';
```

En producción se debe deshabilitar el registro público y crear los miembros mediante invitación.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm run build
```

La base local completa requiere Docker para ejecutar `supabase start` y validar la migración contra Postgres.
