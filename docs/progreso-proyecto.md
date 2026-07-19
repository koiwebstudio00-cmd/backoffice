# Progreso del proyecto — Koi Office

Última actualización: 18 de julio de 2026.

## Estado general

Koi Office ya cuenta con una base funcional conectada a Supabase y reemplazó la información ficticia en los módulos principales. La autenticación, el layout general, el dashboard y las operaciones CRUD de clientes, proyectos y tareas están implementados. Finanzas está implementado y operativo: su migración ya fue aplicada en el proyecto remoto y se validó el alta de movimientos contra la base real.

Cada cliente tiene además su propia ficha centralizada, donde se ven y se gestionan en un solo lugar sus proyectos, pagos, tareas y un feed de notas con fecha y autor. Y cada proyecto tiene su propia página de detalle con la misma lógica: tareas, hitos, pagos, notas y credenciales del proyecto reunidos en un solo lugar. Las credenciales quedan como sección "próximamente" dentro de ambas fichas, a la espera de la Bóveda.

Los pagos pueden ser mensuales recurrentes (se autogenera el próximo mes) y los proyectos manejan, además de su deadline final, hitos con fecha para cada etapa del desarrollo.

El Calendario está implementado en su primera versión interna: reuniones propias (con relación muchos-a-muchos a proyectos) y vistas día, semana y mes que unifican reuniones, deadlines, hitos y vencimientos de pagos y tareas. La integración con Google Calendar queda para un incremento posterior. La Bóveda de credenciales está implementada y **desplegada**: cifrado del lado servidor con AES-256-GCM, reveal gate con re-validación, Edge Functions desplegadas y llave maestra cargada; validada de punta a punta.

## Funcionalidades terminadas

### Plataforma y experiencia de usuario

- Aplicación desarrollada con React 19, Vite y TypeScript estricto.
- Tailwind CSS 4 y componentes shadcn/ui.
- Identidad visual con el color principal `#F97415`.
- Temas claro, oscuro y automático.
- Sidebar responsive basado en el bloque `sidebar-07` de shadcn/ui.
- Navegación y acciones adaptadas al rol del usuario.
- Rutas cargadas de forma diferida para reducir el código de cada pantalla.
- Diálogos de alta y edición de proyecto, tarea y movimiento extraídos a componentes reutilizables (`src/components/forms/`), consumidos tanto por las pestañas globales como por la ficha del cliente para evitar duplicación.

### Autenticación y permisos

- Inicio y cierre de sesión mediante Supabase Auth.
- Rutas privadas protegidas.
- Perfil de equipo asociado automáticamente a cada usuario.
- Roles disponibles: `owner` y `member`.
- Los miembros pueden crear, leer y editar información operativa.
- Las eliminaciones y los datos financieros están restringidos al rol `owner`.
- La autorización real se aplica mediante Row Level Security; la UI solo refleja esos permisos.

### Dashboard

- Indicadores construidos con información real de Supabase.
- Resumen de clientes, proyectos, tareas y progreso.
- Eliminación de los datos placeholder utilizados durante el prototipado.

### Clientes

- Alta, listado, búsqueda y filtrado por estado.
- Edición de datos comerciales, contacto, notas y estado.
- Eliminación exclusiva para `owner` con confirmación.
- Protección contra la eliminación de clientes que todavía poseen proyectos.
- Acceso a la ficha del cliente desde el nombre o el menú de acciones de cada fila.

### Ficha de cliente

- Pantalla propia por cliente en `clientes/:clientId`, con encabezado de contacto, estado y métricas (proyectos, progreso promedio, tareas abiertas, próxima fecha).
- Pestañas: Resumen, Proyectos, Pagos, Tareas, Notas y Credenciales.
- Toda la información del cliente cruzada en un solo lugar: sus proyectos con progreso, sus pagos con pendientes por moneda, y sus tareas reunidas a través de todos sus proyectos.
- Edición embebida: se pueden crear y editar proyectos, pagos y tareas directamente desde la ficha, con el cliente pre-cargado y bloqueado, sin salir a las pestañas globales.
- Las pestañas Pagos y Credenciales son exclusivas de `owner`; no aparecen para `member` y RLS refuerza el acceso aunque se entre por URL.
- Se mantienen las pestañas globales (Proyectos, Finanzas) para la vista agregada entre clientes.

### Ficha de proyecto

- Página propia por proyecto en `proyectos/:projectId`, accesible desde Proyectos (menú "Ver detalle") y desde el nombre del proyecto en la ficha del cliente.
- Encabezado con cliente enlazado, estado y tipo, más métricas (progreso, tareas abiertas, próxima fecha, presupuesto para `owner`).
- Pestañas: Resumen, Tareas (tablero por estado con alta/edición/cambio rápido/eliminación), Hitos, Pagos (owner), Notas del proyecto y Credenciales (placeholder).
- La edición de tareas, pagos y notas se hace desde la misma página, con el proyecto y el cliente pre-cargados.

### Notas

- Feed de notas con fecha y autor; varias por cliente y vínculo opcional a un proyecto.
- Gestionables tanto a nivel cliente (ficha) como a nivel proyecto (página de proyecto y vista de Proyectos), mediante un panel reutilizable.
- Alta, edición y eliminación; editar y eliminar quedan habilitados solo para el autor de la nota o un `owner` (reforzado por RLS).

### Pagos recurrentes

- Un movimiento puede marcarse como mensual recurrente; el sistema mantiene siempre el próximo mes creado como pendiente y lo va generando hacia adelante a medida que se cobra.
- Cada mes es un registro independiente, editable o cancelable por separado. Destildar la recurrencia corta la generación futura.
- Generación idempotente con triggers en la base, sin cascadas; en meses cortos la fecha cae al último día disponible.

### Hitos de proyecto

- Además del deadline final, cada proyecto tiene hitos con título y fecha para cada etapa.
- Alta, edición, marca de cumplido y eliminación (eliminación solo `owner`). Los hitos vencidos pendientes se marcan en rojo y alimentan la "próxima fecha".

### Calendario (versión interna)

- Reuniones propias guardadas en la base, con relación muchos-a-muchos a proyectos (una reunión puede tocar varios proyectos o ninguno).
- Alta, edición y eliminación de reuniones (eliminación solo `owner`); fecha, hora de inicio y fin opcional, lugar/link, notas y selección de proyectos.
- Vistas **día, semana y mes** con navegación (anterior/siguiente/hoy); la página abre por defecto en vista mensual.
- Cada vista unifica reuniones, deadlines de proyectos, hitos, vencimientos de pagos (solo `owner`) y vencimientos de tareas, con referencia cruzada a cada proyecto o a Finanzas.
- En el home se muestra la agenda del día actual; si no hay nada, aparece el mensaje "Nada para hoy pa".
- Las horas se manejan en zona horaria de Argentina. La sincronización con Google Calendar queda como incremento posterior.

### Bóveda de credenciales

- Modelo Opción A: cifrado del lado servidor con AES-256-GCM dentro de Edge Functions; la base solo guarda ciphertext + IV y la llave maestra vive como secret de Supabase.
- Gestión desde la pestaña Credenciales de la ficha de cliente y de la página de proyecto (solo `owner`), con servicio, URL, usuario, contraseña y notas (contraseña y notas cifradas).
- **Reveal gate**: al revelar se reingresa la contraseña del usuario (step-up auth) con ventana de comodidad de 5 minutos; el secreto se muestra con copiar y se oculta solo a los 30 segundos, sin cachearse.
- Cada reveal queda registrado en `credential_access_log` (quién, qué, cuándo).
- `key_version` por fila preparado para rotación de llave a futuro.
- Edge Functions `save-credential` y `reveal-credential` desplegadas (autocontenidas, sin imports compartidos) y llave maestra cargada como secret; flujo guardar/revelar validado en producción.
- Despliegue y pasos de configuración en [`vault-setup.md`](vault-setup.md).

### Proyectos

- Un proyecto puede pertenecer a un cliente o ser **interno del estudio** (SaaS propios como Toki o Aido), sin cliente.
- La página de Proyectos es una **lista completa** de todos los proyectos (de clientes e internos), con búsqueda, filtro por estado y acceso al detalle de cada uno.
- Alta y asociación opcional con clientes existentes.
- Edición de cliente, nombre, tipo, estado y fechas.
- Presupuesto y moneda visibles y editables únicamente por `owner`.
- Progreso calculado a partir de las tareas completadas.
- Eliminación exclusiva para `owner`, incluyendo sus tareas y datos financieros asociados.

### Tareas

- Alta dentro del proyecto seleccionado.
- Tablero agrupado por estado: por hacer, en curso, revisión y terminado.
- Edición de título, estado y vencimiento.
- Cambio rápido de estado desde la tarjeta.
- Eliminación exclusiva para `owner` con confirmación.

### Finanzas

- CRUD de ingresos y egresos exclusivo para `owner`.
- Monedas ARS, USD y USDT con totales independientes.
- Caja realizada, cuentas por cobrar y cuentas por pagar.
- Estados pendiente, realizado y cancelado.
- Vínculos opcionales con clientes y proyectos.
- Vencimientos atrasados y resultado realizado por proyecto.
- Migración, repositorio, tipos y UI terminados.
- Migración `20260629200357_finance_module.sql` aplicada en el proyecto remoto y alta de movimientos validada contra la base real.
- Corregido un bug en el campo Importe del formulario: el `min` y el `step` del input numérico eran incompatibles (`min="0.00000001"` con `step="0.01"`), por lo que el navegador rechazaba importes normales como 1500. Ahora `min` y `step` coinciden según la moneda (0.01 para ARS/USD, 0.00000001 para USDT).

### Pedidos de features (Incremento 1.1)

- Página `features`, visible para todo el equipo, para proponer mejoras al propio sistema.
- Pedidos con título, descripción, autor y estado (`proposed`, `accepted`, `in_progress`, `done`, `rejected`); el estado lo cambia solo `owner` (UI + trigger en la base).
- Comentarios por pedido con autor y fecha; eliminación de comentarios para el autor o un `owner`.
- El autor edita su pedido; eliminación de pedidos solo `owner` con confirmación.
- Migración `20260718120000_feature_requests.sql` creada; **pendiente de aplicar en el proyecto remoto**.

### Archivos .env por proyecto (Incremento 1.1)

- Pestaña "Variables de entorno" en la página del proyecto, exclusiva de `owner`.
- Varios archivos por proyecto (nombre único por proyecto, ej. `.env`, `.env.production`); el contenido completo se cifra como blob con AES-256-GCM en Edge Functions, mismo modelo Opción A de la bóveda.
- Reveal gate idéntico al de credenciales (re-validación con ventana de 5 minutos); el contenido se muestra 60 segundos con copiar y cada reveal queda en `env_file_access_log`.
- Edge Functions `save-env-file` y `reveal-env-file` (autocontenidas, comparten la `MASTER_ENCRYPTION_KEY`); **pendientes de desplegar**, junto con la migración `20260718121000_project_env_files.sql`.

### Portal público de clientes (Incremento 1.1)

- Página pública `/portal/:token` de solo lectura, fuera del layout autenticado: proyectos con avance derivado e hitos, pagos hechos y futuros mostrando **solo fecha, método de pago, moneda y estado (nunca importes)**, y las notas del cliente completas.
- Acceso por link portador: token aleatorio de 32 bytes cuyo **hash SHA-256** es lo único que se guarda; el link se muestra una sola vez al generarlo. Un token activo por cliente.
- Gestión desde la ficha del cliente (solo `owner`): botón "Portal del cliente" con activar, desactivar y regenerar link, estado del token y fecha de último acceso.
- Edge Function `get-client-portal` (único punto de entrada anónimo): valida el hash, responde igual ante token inexistente o revocado, registra `last_accessed_at` y devuelve el payload curado con `service_role` interno. El portal nunca consulta las tablas directamente.
- Campo nuevo `payment_method` (`transfer`/`crypto`/`cash`/`card`/`other`) en movimientos, editable desde el formulario de Finanzas.
- Migración `20260718130000_client_portal.sql` y la función **pendientes de aplicar/desplegar en el proyecto remoto**.

## Base de datos

El esquema, repartido en tres migraciones, incluye:

- Tablas `profiles`, `clients`, `projects`, `project_financials`, `tasks`, `financial_movements`, `notes`, `milestones`, `meetings`, `meeting_projects`, `credentials` y `credential_access_log`.
- Enumeraciones para roles y estados.
- Índices para búsquedas y relaciones frecuentes.
- Triggers para mantener `updated_at` y preservar `created_by`.
- Restricciones de integridad para nombres, fechas, importes y relaciones.
- RLS habilitado en todas las tablas de aplicación.
- Políticas diferenciadas para miembros y propietarios.
- `GRANT` explícitos para el acceso mediante la Data API de Supabase.
- Montos financieros separados de los datos operativos para evitar su exposición a miembros.

Migraciones aplicadas en el proyecto remoto:

- `20260627221059_initial_schema.sql`: esquema base (perfiles, clientes, proyectos, tareas, financieros y RLS).
- `20260629200357_finance_module.sql`: módulo de movimientos financieros.
- `20260629215557_notes.sql`: feed de notas, con trigger que valida que el proyecto de la nota pertenezca a su cliente y RLS de autor/owner para editar y eliminar.
- `20260629234231_recurring_payments.sql`: recurrencia mensual en `financial_movements` (`recurrence`, `series_id`) con generación idempotente por triggers `security definer`.
- `20260630000242_milestones.sql`: hitos de proyecto, con RLS de equipo y eliminación solo `owner`.
- `20260630002807_meetings.sql`: reuniones y su tabla puente `meeting_projects` (muchos-a-muchos con proyectos), con RLS de equipo y eliminación solo `owner`.
- `20260630022302_credentials.sql`: bóveda de credenciales (`credentials` con ciphertext/iv/key_version y `credential_access_log`), con RLS exclusiva de `owner`.
- `20260630041034_internal_projects.sql`: `client_id` opcional en `projects`, `notes` y `credentials` (proyectos internos del estudio), con checks de anclaje y triggers de validación que admiten proyectos sin cliente.

Migraciones creadas, pendientes de aplicar en el proyecto remoto:

- `20260718120000_feature_requests.sql`: pedidos de features (`feature_requests` + `feature_request_comments`), con trigger que restringe el cambio de estado a `owner`.
- `20260718121000_project_env_files.sql`: archivos .env cifrados (`project_env_files` + `env_file_access_log`), con RLS exclusiva de `owner`.
- `20260718130000_client_portal.sql`: portal de clientes (`client_portal_tokens` con hash de token e índice único parcial de un token activo por cliente) y columna `payment_method` en `financial_movements`.

## Documentación disponible

- [`crud-modules.md`](crud-modules.md): detalle de operaciones, permisos y validaciones por módulo.
- [`finance-module.md`](finance-module.md): alcance, modelo y estado de despliegue de Finanzas.
- [`../README.md`](../README.md): instalación, configuración y comandos principales.

## Verificaciones realizadas

- TypeScript: `npm run typecheck`.
- Calidad de código: `npm run lint`.
- Compilación de producción: `npm run build`.
- Revisión de políticas RLS, permisos y relaciones de borrado.
- Revisión de buenas prácticas de React en los flujos modificados.

El build es correcto. Existe una advertencia no bloqueante por el tamaño del bundle inicial, pendiente de una futura optimización de carga.

## Módulos pendientes

### Calendario — pendiente del incremento de Google

- Sincronización con Google Calendar (la versión interna ya está operativa).
- Recordatorios e invitaciones.

### Bóveda — incrementos a futuro

- Rotación automática de la llave maestra (la estructura con `key_version` ya lo contempla).

## Próximo paso recomendado

Los cinco módulos centrales (Clientes, Proyectos, Finanzas, Calendario y Bóveda) están implementados y desplegados, con todas las migraciones aplicadas en el proyecto remoto y la Bóveda funcionando de punta a punta.

El Incremento 1.1 completo (Features, Archivos .env y Portal de clientes) está implementado en código. Para dejarlo operativo falta: aplicar las tres migraciones nuevas (`supabase db push`) y desplegar las Edge Functions `save-env-file`, `reveal-env-file` y `get-client-portal` (`supabase functions deploy`).

Los incrementos restantes son opcionales: la sincronización del Calendario con Google Calendar, la rotación automática de la llave maestra y la consolidación multi-moneda de Finanzas.
