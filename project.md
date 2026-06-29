# Sistema de Gestión — Agencia de Software

Documento de arquitectura y especificación técnica.

---

## 1. Descripción general

Back office interno para la agencia: un solo lugar donde manejar clientes, sus proyectos y el progreso de cada uno, las finanzas (ingresos, gastos y rentabilidad por proyecto), la agenda de reuniones y deadlines, y una bóveda segura para cuentas y contraseñas de clientes.

Es un sistema **de uso interno y single-tenant** (una sola organización: la agencia). Hoy lo usan dos personas, los dos founders, ambos con acceso total. El diseño contempla sumar miembros más adelante sin rehacer la base.

### Stack

- **Frontend:** React + Vite.
- **Backend:** Supabase como plataforma completa.
  - **Postgres** para los datos.
  - **Auth** para el login del equipo.
  - **RLS (Row Level Security)** para los permisos.
  - **Storage** para archivos.
  - **Edge Functions** para la lógica sensible (cifrado/descifrado del vault, sync de calendario).
- **Integraciones:** Google Calendar API.

### Roles y permisos

Modelo simple con un enum de rol por usuario:

- `owner` — los founders. Acceso total, incluido finanzas y bóveda.
- `member` — futuros colaboradores. Acceso a clientes y proyectos; **sin** acceso a finanzas ni credenciales por defecto.

Regla general de RLS: clientes y proyectos son visibles para todo el equipo (la transparencia ayuda en una agencia chica); **finanzas y credenciales quedan restringidas a `owner`**.

---

## 2. Módulos

El sistema tiene cinco módulos: Clientes, Proyectos y progreso, Finanzas, Calendario y Bóveda de credenciales.

### 2.1 Clientes (CRM liviano)

Ficha de cada cliente con su información de contacto y estado. Todo lo demás del sistema cuelga de acá.

```
clients
  id
  name
  company
  email
  phone
  status          -- 'lead' | 'active' | 'paused' | 'closed'
  notes
  created_at
  updated_at
```

### 2.2 Proyectos y progreso

Cada proyecto pertenece a un cliente. El progreso se maneja con tareas/hitos en un kanban simple, y de ahí sale el porcentaje de avance.

```
projects
  id
  client_id        -- FK a clients
  name
  type             -- 'web' | 'ai_agent' | 'maintenance' | ...
  status           -- 'active' | 'paused' | 'done' | ...
  budget
  currency
  start_date
  deadline         -- deadline principal del proyecto
  created_at
  updated_at

tasks
  id
  project_id       -- FK a projects
  title
  status           -- 'todo' | 'doing' | 'review' | 'done'
  due_date (nullable)
  position         -- orden dentro de la columna
  created_at
```

El **% de avance** se deriva: `tasks done / total tasks` por proyecto. No se guarda como campo fijo, se calcula.

### 2.3 Finanzas

Ver sección técnica 3.1. Cubre P&L global, rentabilidad por proyecto, gastos categorizados y plan de cuotas.

### 2.4 Calendario

Ver sección técnica 3.2. Vista única que combina reuniones (Google Calendar) y deadlines (base propia).

### 2.5 Bóveda de credenciales

Ver sección técnica 3.3. Contraseñas cifradas con re-validación al revelar ("reveal gate"), bajo el modelo de **encriptación del lado servidor (Opción A)**.

---

## 3. Detalles técnicos

### 3.1 Finanzas

#### Tabla de movimientos

Una sola tabla de transacciones reales, de la que se derivan todas las vistas.

```
transactions
  id
  type             -- 'income' | 'expense'
  amount
  currency         -- siempre se guarda la moneda original
  category         -- 'client_payment' | 'hosting' | 'tools' | 'salary' | 'taxes' | ...
  client_id (nullable)
  project_id (nullable)
  description
  transaction_date
  created_by
  created_at
```

**Vistas que salen de acá:**

- **P&L global:** sumar `income` menos `expense` en un rango de fechas.
- **Rentabilidad por proyecto:** agrupar por `project_id` (ingresos del proyecto menos gastos imputados a ese proyecto). Es la métrica clave: muestra qué cliente deja plata y cuál trabaja a pérdida.

#### Plan de cuotas (installments)

Las cuotas programadas **no son plata que ya entró**. Viven en su propia tabla como pendientes y solo generan una transacción real cuando se cobran.

```
payment_schedule
  id
  project_id
  amount
  currency
  due_date
  status               -- 'pending' | 'paid' | 'overdue'
  paid_transaction_id  -- FK a transactions, nullable
```

**Flujo:** una cuota arranca `pending`. Cuando el cliente paga, se marca `paid` y eso **genera** una `transaction` de tipo `income` atada al proyecto (referenciada en `paid_transaction_id`). Así nunca se cuenta como ingreso algo no cobrado, pero el dashboard sí muestra "te deben $X" y "vence el día Y".

Un cron diario (**pg_cron**) marca como `overdue` las cuotas vencidas no pagadas.

#### Manejo de monedas

Se trabaja con clientes que pagan en USD y gastos en ARS. Mezclar monedas en una suma falsea el P&L.

- **Enfoque MVP (recomendado):** guardar siempre `currency` + `amount` originales y mostrar totales **separados por moneda** (USD: tanto / ARS: tanto).
- **Consolidado (más adelante):** agregar un campo `amount_base` (la moneda base) calculado con el tipo de cambio del día de la transacción. Requiere definir qué cotización usar (oficial / MEP / blue) y traerla.

**Regla de oro:** nunca perder la moneda y el monto original. El consolidado siempre es derivable después, así que sumar `amount_base` no requiere migración.

### 3.2 Calendario

**Principio:** Google Calendar es la fuente de verdad para reuniones; la base propia lo es para deadlines.

- **Reuniones:** se crean y leen vía Google Calendar API. Se aprovechan gratis las invitaciones, recordatorios, link de Meet y que aparezcan en el celular de los founders.
- **Deadlines:** viven en la base, porque son datos del proyecto (campo `deadline` en `projects` o en los hitos), no eventos sueltos.

**Vista unificada:** el frontend combina ambas fuentes (eventos de Google + deadlines de Postgres) y las renderiza en una sola grilla.

**Optimización (post-MVP):** para no pegarle a la API de Google en cada carga, mantener un espejo liviano de eventos y sincronizar con el **sync token** de Google (trae solo lo que cambió).

```
calendar_events            -- espejo liviano, opcional para MVP
  id
  google_event_id
  title
  start_at
  end_at
  meet_link
  synced_at
```

Para el MVP es válido leer de Google en vivo y agregar el espejo cuando la performance lo pida.

### 3.3 Bóveda de credenciales (Opción A: cifrado del lado servidor)

**Principio central:** la base solo ve texto cifrado, la llave maestra vive fuera de la base, y descifrar solo ocurre dentro de una Edge Function después de re-validar al usuario.

#### Tabla

```
credentials
  id
  client_id
  project_id (nullable)
  service_name        -- en claro, para listar/buscar
  service_url         -- en claro
  username            -- en claro
  secret_ciphertext   -- la password cifrada
  secret_iv           -- nonce único por secreto
  notes_ciphertext (nullable)
  key_version         -- para rotación de llave
  created_by
  created_at
  updated_at
```

Nunca se guarda la password en claro ni la llave en esta tabla.

#### Llave maestra

Una `MASTER_ENCRYPTION_KEY` de 32 bytes (AES-256) guardada como **secret de Supabase** (env var de Edge Functions), **no** en Postgres. Solo las Edge Functions la tocan. Si se filtra la base, sale puro ciphertext y la llave no está ahí.

#### Flujo de guardar (cifrar)

1. El frontend manda la password en claro a la Edge Function `save-credential` (HTTPS + JWT).
2. La función genera un `iv` random nuevo por secreto.
3. Cifra con **AES-256-GCM** (GCM incluye tag de integridad: detecta manipulación del ciphertext).
4. Guarda `ciphertext` + `iv` + `key_version`. La llave nunca sale de la función.

#### Flujo de revelar (reveal gate)

1. El frontend pide la clave del usuario y hace `supabase.auth.signInWithPassword(...)` (step-up auth: re-valida sin romper la sesión, la refresca).
2. Con eso llama a la Edge Function `reveal-credential` con el JWT.
3. La función valida el JWT, chequea rol `owner`, descifra ese secreto puntual y lo devuelve **una sola vez**.
4. El frontend lo muestra unos segundos / con botón de copiar y lo borra de memoria. No se cachea.

**Ventana de comodidad:** se puede guardar el timestamp de la última re-validación y dar, por ejemplo, 5 minutos de reveals válidos antes de volver a pedir la clave. Ajustable según el balance comodidad/seguridad deseado.

#### RLS y auditoría

- RLS en `credentials`: solo rol `owner` puede ver/escribir.
- Tabla de log de accesos:

```
credential_access_log
  id
  credential_id
  user_id
  accessed_at
```

Cada reveal deja registro (quién, qué, cuándo). Barato y útil ante cualquier duda futura.

#### Rotación de llave

La `MASTER_ENCRYPTION_KEY` está versionada (`key_version` por fila). Para rotar: re-cifrar fila por fila con la llave nueva sin romper lo viejo.

#### Defensa principal del modelo

Como en la Opción A el servidor técnicamente puede descifrar (la llave está del lado de Supabase), la primera línea de defensa es que nadie entre al proyecto de Supabase. **MFA obligatorio** en las cuentas de Supabase de ambos founders, RLS estricta y cuidado con la service key.

---

## 4. Orden sugerido de construcción

1. **Auth + roles + esquema base.** Login de Supabase, enum de rol, tablas `clients` y `projects` con sus RLS. Es el esqueleto del que cuelga todo.
2. **Clientes y proyectos (CRUD + kanban).** El núcleo operativo y el % de avance derivado. Ya es usable como gestor de proyectos.
3. **Finanzas.** Tabla `transactions`, dashboard de P&L, rentabilidad por proyecto, y después el `payment_schedule` con su cron de vencimientos.
4. **Bóveda de credenciales.** Las Edge Functions de cifrar/revelar, el reveal gate y el log. Se hace cuando el esquema de auth ya está sólido, porque depende de él.
5. **Calendario.** Integración con Google Calendar API y la vista unificada con deadlines. El espejo con sync token queda como optimización posterior.

---

## 5. Decisiones tomadas (registro)

- **Alcance:** uso interno, single-tenant, dos founders (`owner`), preparado para sumar `member`.
- **Stack:** React/Vite + Supabase (Postgres, Auth, RLS, Storage, Edge Functions).
- **Vault:** Opción A — cifrado del lado servidor (AES-256-GCM) con reveal gate por re-validación. MFA en Supabase como defensa principal.
- **Finanzas:** multi-moneda con montos originales siempre preservados; totales separados por moneda en el MVP, consolidado opcional después. Cuotas programadas separadas de transacciones reales.
- **Calendario:** Google Calendar como fuente de verdad para reuniones; deadlines en base propia; vista unificada en el frontend.
