# AGENTS.md — Guía para agentes de código

Koi Office: back office interno de la agencia KOI. SPA React 19 + Vite + TypeScript estricto, con Supabase (Postgres, Auth, RLS, Edge Functions) como backend. Single-tenant, dos roles: `owner` y `member`. Idioma del producto y la documentación: **español**.

## Comandos

```bash
npm run dev         # servidor de desarrollo
npm run typecheck   # tsc -b (estricto, debe pasar)
npm run lint        # eslint (debe pasar)
npm run build       # tsc + vite build (debe pasar)
```

Antes de dar por terminado cualquier cambio: `typecheck`, `lint` y `build` en verde. No hay suite de tests; estos tres comandos son el gate.

## Arquitectura (lo esencial)

- `src/data/repository.ts` — **única** capa de acceso a datos. Toda consulta/mutación a Supabase va acá, no en componentes.
- `src/pages/` — una página por módulo; `ClientDetailPage` y `ProjectDetailPage` son las fichas con pestañas.
- `src/components/forms/` — diálogos reutilizables de alta/edición (proyecto, tarea, movimiento, reunión). Reutilizarlos; no duplicar formularios.
- `src/components/ui/` — componentes shadcn/ui. No editarlos a mano salvo necesidad real.
- `src/lib/database.types.ts` — tipos generados del esquema. Regenerar si cambia el esquema.
- `supabase/migrations/` — esquema versionado. Todo cambio de base va en una migración nueva, nunca editando migraciones aplicadas.
- `supabase/functions/` — Edge Functions de la bóveda (`save-credential`, `reveal-credential`), autocontenidas, sin imports compartidos.

Documentación: `docs/system-design.md` (arquitectura), `docs/prd.md` (producto), `project.md` (especificación original), `docs/progreso-proyecto.md` (estado).

## Reglas de seguridad (no negociables)

- La autorización real es **RLS en Postgres**. La UI solo la refleja. Cualquier tabla nueva lleva RLS habilitado, políticas y `GRANT` explícito a `authenticated`.
- Datos financieros y credenciales: solo rol `owner`, en RLS y en UI. Los montos viven en `project_financials` / `financial_movements`, separados de lo operativo.
- La bóveda nunca guarda secretos en claro: solo ciphertext + IV + `key_version`. La llave maestra es un secret de Edge Functions; **jamás** en Postgres, en el repo o en el frontend.
- `service_role` nunca en variables `VITE_*` ni en código de navegador.
- Las mutaciones deben verificar fila afectada (`select('id').single()`); una operación rechazada por RLS no es un éxito silencioso.

## Convenciones

- El progreso de proyecto **se deriva** de tareas (`done / total`); nunca almacenarlo.
- Monedas: nunca mezclar ARS/USD/USDT en un total; nunca perder moneda y monto originales. Importes `numeric(20,8)`.
- Textos opcionales vacíos → `null`. Validar en formulario **y** con constraints en Postgres.
- Eliminaciones: solo `owner`, siempre con diálogo de confirmación.
- Fechas/horas en zona horaria de Argentina.
- UI en español (labels, mensajes, errores). Código (identificadores) en inglés.
- Rutas nuevas: carga diferida, registradas en `src/App.tsx` y en la navegación por rol (`src/layout/navigation.ts`).

## Al terminar una feature

1. `npm run typecheck && npm run lint && npm run build`.
2. Actualizar `docs/progreso-proyecto.md` y el doc del módulo si aplica.
3. Si hubo migración: verificar RLS, GRANTs, índices y triggers de `updated_at`/`created_by`.
