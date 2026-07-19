# CLAUDE.md

Leé y seguí [AGENTS.md](AGENTS.md): contiene los comandos, la arquitectura, las reglas de seguridad y las convenciones del proyecto.

Notas adicionales para Claude:

- Gate obligatorio antes de terminar: `npm run typecheck && npm run lint && npm run build`.
- Todo acceso a datos pasa por `src/data/repository.ts`; no consultes Supabase desde componentes.
- Cambios de esquema: siempre una migración nueva en `supabase/migrations/`, con RLS + políticas + GRANT, y regenerar `src/lib/database.types.ts`.
- Nunca toques la lógica de cifrado de la bóveda sin leer `docs/vault-setup.md` y `docs/system-design.md` §4.2.
- Respondé y escribí documentación en español; identificadores de código en inglés.
