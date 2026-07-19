# System Design — Koi Office

Arquitectura del sistema tal como está desplegado. Complementa a [`prd.md`](prd.md) y a la especificación original [`../project.md`](../project.md).

---

## 1. Vista general

```
┌────────────────────────────┐
│  SPA React 19 + Vite       │  Tailwind 4 · shadcn/ui · React Router 7
│  src/data/repository.ts    │  única capa de acceso a datos
└─────────────┬──────────────┘
              │ supabase-js (HTTPS + JWT)
┌─────────────▼──────────────────────────────────────┐
│  Supabase                                          │
│  ├─ Auth        sesiones, step-up auth             │
│  ├─ Postgres    esquema + RLS + triggers           │
│  ├─ Data API    GRANTs explícitos a authenticated  │
│  └─ Edge Fns    save-credential / reveal-credential│
│                 (llave maestra como secret)        │
└────────────────────────────────────────────────────┘
```

Decisiones estructurales: single-tenant, sin backend propio (Supabase como plataforma completa), autorización en la base (RLS) y no en el cliente, y lógica sensible solo en Edge Functions.

## 2. Frontend

- **Rutas** (React Router, carga diferida): `/login`, `/` (dashboard), `clientes`, `clientes/:clientId`, `proyectos`, `proyectos/:projectId`, `finanzas`, `calendario`, `credenciales`, 404.
- **Capas:**
  - `src/auth/` — `AuthProvider` (sesión + perfil + rol), `ProtectedRoute`.
  - `src/data/repository.ts` — todas las consultas y mutaciones a Supabase. Las mutaciones piden la fila afectada (`select('id').single()`) para no tratar como éxito una operación rechazada por RLS.
  - `src/components/forms/` — diálogos reutilizables (proyecto, tarea, movimiento, reunión) consumidos por las pestañas globales y las fichas, con entidades pre-cargadas.
  - `src/lib/` — cliente supabase, `database.types.ts` (tipos generados), formato, calendario, mapeo de errores.
- **UI por rol:** la navegación y las acciones se filtran según el rol del perfil, pero es solo reflejo — la autorización real es RLS.
- **Temas:** claro/oscuro/automático; color de marca `#F97415`; fuente Geist.

## 3. Modelo de datos

Tablas principales (8 migraciones en `supabase/migrations/`):

| Tabla | Propósito | Acceso |
|---|---|---|
| `profiles` | Perfil + rol (`owner`/`member`) por usuario de Auth | equipo |
| `clients` | CRM: contacto, estado, notas | equipo; delete owner |
| `projects` | Proyectos de cliente o internos (`client_id` nullable) | equipo; delete owner |
| `project_financials` | Presupuesto y moneda, separado de lo operativo | solo owner |
| `tasks` | Kanban (`todo`/`doing`/`review`/`done`), posición, vencimiento | equipo; delete owner |
| `milestones` | Hitos con fecha por proyecto | equipo; delete owner |
| `financial_movements` | Ingresos/egresos ARS-USD-USDT, estados, recurrencia | solo owner |
| `notes` | Feed por cliente/proyecto con autor | equipo; edición autor u owner |
| `meetings` + `meeting_projects` | Reuniones, N-a-N con proyectos | equipo; delete owner |
| `credentials` | `service_name`/`url`/`username` en claro; `secret_ciphertext`, `secret_iv`, `notes_ciphertext`, `key_version` | solo owner |
| `credential_access_log` | Auditoría de reveals | solo owner |

Reglas de integridad relevantes:

- Clientes con proyectos: `ON DELETE RESTRICT`. Dependencias de proyecto (tareas, financieros): `ON DELETE CASCADE`.
- `project_dates_are_valid`: deadline ≥ inicio. Trigger que valida que el cliente de un movimiento/nota coincida con el del proyecto asociado.
- Importes `numeric(20,8)` (precisión USDT); movimiento realizado exige fecha de cobro/pago.
- Triggers de `updated_at` y preservación de `created_by`.
- **El progreso de proyecto nunca se almacena**: se deriva de `tasks done / total`.

### Pagos recurrentes

`financial_movements` lleva `recurrence` y `series_id`. Triggers `security definer` mantienen siempre creado el próximo mes pendiente de cada serie, con generación idempotente y sin cascadas; en meses cortos la fecha cae al último día disponible. Cada mes es una fila independiente.

## 4. Seguridad

### 4.1 Autorización (RLS)

- RLS habilitado en todas las tablas de aplicación; `GRANT` explícitos al rol `authenticated` para la Data API (RLS decide las filas).
- Patrón general: equipo autenticado lee/crea/edita lo operativo; eliminaciones y todo lo financiero/credenciales solo `owner`.
- Montos separados en `project_financials` para que un `member` nunca reciba cifras por accidente en un `select *`.

### 4.2 Bóveda (cifrado del lado servidor — Opción A)

```
guardar:  UI ──password──▶ Edge Fn save-credential
          valida JWT + rol owner → IV nuevo → AES-256-GCM
          → guarda ciphertext + iv + key_version

revelar:  UI ──signInWithPassword (step-up)──▶ Auth
          UI ──JWT──▶ Edge Fn reveal-credential
          valida JWT + rol → descifra ese secreto → devuelve una vez
          → inserta en credential_access_log
```

- `MASTER_ENCRYPTION_KEY` (32 bytes, AES-256) vive como secret de Edge Functions, nunca en Postgres. Si se filtra la base, solo hay ciphertext.
- GCM aporta tag de integridad (detecta manipulación). IV único por secreto.
- Ventana de comodidad: 5 minutos de reveals tras la re-validación; el secreto se muestra 30 s y no se cachea.
- `key_version` por fila permite rotar la llave re-cifrando por lotes.
- Defensa principal: nadie entra al proyecto de Supabase — MFA obligatorio en las cuentas de ambos founders, cuidado extremo con `service_role` (jamás en `VITE_*`).
- Despliegue: [`vault-setup.md`](vault-setup.md).

## 5. Calendario

- Versión interna: reuniones en `meetings`, unificadas en el frontend (`src/lib/calendar.ts`) con deadlines de proyectos, hitos, vencimientos de pagos (owner) y de tareas. Vistas día/semana/mes; zona horaria de Argentina.
- Incremento planificado: Google Calendar como fuente de verdad para reuniones (invitaciones, Meet, recordatorios), con espejo local `calendar_events` sincronizado por sync token para no pegarle a la API en cada carga.

## 6. Multi-moneda

- Regla de oro: nunca perder `currency` + `amount` originales. Totales siempre separados por moneda (ARS / USD / USDT).
- Consolidado futuro: campo derivable `amount_base` con la cotización del día de la transacción (definir oficial/MEP/blue). No requiere migración destructiva.

## 7. Entornos y despliegue

- **Frontend:** build de Vite (`npm run build`); variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Base:** migraciones versionadas con Supabase CLI (`supabase db push`); desarrollo local con Docker (`supabase start`).
- **Edge Functions:** `supabase functions deploy save-credential reveal-credential`; autocontenidas, sin imports compartidos.
- **Gates de calidad:** `npm run typecheck`, `npm run lint`, `npm run build`.

## 8. Incremento 1.1 — diseño de los módulos nuevos

### 8.1 Archivos .env por proyecto

Reutiliza el modelo de la bóveda (Opción A): blob cifrado del lado servidor, llave maestra como secret, reveal gate.

```
project_env_files
  id
  project_id           -- FK a projects
  name                 -- '.env', '.env.production', ... único por proyecto
  content_ciphertext   -- el archivo completo cifrado (AES-256-GCM)
  content_iv           -- IV único por versión guardada
  key_version
  created_by
  created_at
  updated_at

env_file_access_log
  id
  env_file_id
  user_id
  accessed_at
```

- RLS exclusiva de `owner` en ambas tablas (mismo patrón que `credentials`).
- Edge Functions nuevas y autocontenidas: `save-env-file` y `reveal-env-file`, copiando el patrón de `save-credential`/`reveal-credential` (validar JWT + rol, IV nuevo por escritura, la llave nunca sale de la función, reveal registra en el log).
- Comparte `MASTER_ENCRYPTION_KEY` y la ventana de re-validación de 5 minutos.
- UI: pestaña "Variables de entorno" en `ProjectDetailPage`, solo visible para `owner`.

### 8.2 Pedidos de features

```
feature_requests
  id
  title                -- obligatorio
  description
  status               -- 'proposed' | 'accepted' | 'in_progress' | 'done' | 'rejected'
  created_by
  created_at
  updated_at

feature_request_comments
  id
  feature_request_id   -- FK, ON DELETE CASCADE
  body
  created_by
  created_at
```

- RLS: todo el equipo lee y crea; el autor edita título/descripción de su pedido; **solo `owner` cambia `status`** (política de update separada o trigger que rechace cambios de estado de no-owners); eliminación solo `owner`.
- Comentarios: crear todo el equipo; editar/eliminar autor u `owner` (mismo patrón que `notes`).
- UI: página nueva `features` en la navegación de todos los roles, con filtro por estado.

### 8.3 Portal público de clientes

**Principio:** el portal es anónimo y nunca toca las tablas. Una Edge Function valida el token y arma un payload curado; RLS sigue intacta para el resto del sistema.

```
client_portal_tokens
  id
  client_id            -- FK a clients
  token_hash           -- SHA-256 del token; el token en claro no se guarda
  created_by
  created_at
  revoked_at           -- nullable
  last_accessed_at     -- nullable
```

Flujo:

```
owner:    genera token (aleatorio, 32 bytes) → se muestra una sola vez
          → se guarda solo el hash → comparte URL /portal/<token>

cliente:  GET /portal/<token>
          → Edge Function get-client-portal:
            hashea el token, busca fila vigente (revoked_at IS NULL),
            actualiza last_accessed_at y devuelve el payload curado
          → SPA renderiza la vista pública (solo lectura)
```

Payload curado (lo único que sale de la función):

- **Proyectos** del cliente: nombre, tipo, estado, deadline, % de avance (derivado), hitos con fecha y estado.
- **Pagos** hechos y futuros: **fecha, método de pago, moneda y estado — sin importes ni categorías internas**.
- **Notas** del cliente: contenido completo, fecha y autor.

Decisiones de seguridad:

- La Edge Function usa `service_role` internamente (nunca expuesto); es el único punto de entrada anónimo y responde igual ante token inválido o revocado, sin filtrar existencia de clientes.
- Token hasheado en la base: un dump no sirve para acceder a los portales.
- Revocación inmediata: generar un token nuevo invalida el anterior.
- Riesgo asumido y documentado: el link es portador (quien lo tiene, entra) y las notas se muestran completas; el equipo escribe notas sabiendo que el cliente las lee.
- Rate limiting básico en la función para frenar fuerza bruta de tokens.

Cambio de esquema adicional: columna `payment_method` (nullable, texto corto o enum: `transfer` | `crypto` | `cash` | `card` | `other`) en `financial_movements`, editable desde el formulario de movimiento.

UI interna: sección "Portal del cliente" en la ficha del cliente (solo `owner`) para generar/revocar el token y ver el último acceso. Ruta pública `/portal/:token` fuera del layout autenticado.

## 9. Riesgos y deudas conocidas

- Bundle inicial grande (advertencia de Vite, no bloqueante) — optimización pendiente.
- Sin sync con Google Calendar: las reuniones no generan invitaciones ni recordatorios.
- Rotación de llave manual (estructura lista, proceso no automatizado).
- El rol `member` aún no fue probado con un usuario real en producción.
