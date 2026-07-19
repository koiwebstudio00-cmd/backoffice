# Historias de usuario — Koi Office

Personas: **Founder** (rol `owner`) y **Colaborador** (rol `member`). Todas las historias del MVP están implementadas salvo las marcadas como *roadmap*.

---

## Autenticación y roles

**HU-01 — Iniciar sesión**
Como miembro del equipo quiero iniciar sesión con email y contraseña para acceder al sistema.
- Dado un usuario válido, al ingresar credenciales correctas accedo al dashboard.
- Con credenciales inválidas veo un error claro y no accedo.
- Las rutas privadas redirigen a login si no hay sesión.

**HU-02 — Permisos por rol**
Como founder quiero que los colaboradores no vean finanzas, presupuestos ni credenciales para proteger datos sensibles.
- Un `member` no ve Finanzas ni Credenciales en la navegación ni en las fichas.
- Si un `member` entra por URL, la pantalla informa acceso restringido y RLS bloquea los datos.
- Las eliminaciones solo están disponibles para `owner`.

## Clientes

**HU-03 — Alta y gestión de clientes**
Como miembro quiero crear y editar fichas de clientes con contacto, estado y notas para tener el CRM centralizado.
- Nombre obligatorio (máx. 120 caracteres); campos opcionales vacíos se guardan como `null`.
- Puedo buscar por texto y filtrar por estado (`lead`, `active`, `paused`, `closed`).

**HU-04 — Eliminar cliente (owner)**
Como founder quiero eliminar clientes con confirmación para mantener el CRM limpio sin borrados accidentales.
- Solo `owner` ve la acción; requiere confirmación explícita.
- Un cliente con proyectos no puede eliminarse (`ON DELETE RESTRICT`); la UI explica cómo resolverlo.

**HU-05 — Ficha del cliente**
Como miembro quiero una ficha por cliente con todo lo suyo cruzado en un lugar para no saltar entre pestañas globales.
- Encabezado con contacto, estado y métricas (proyectos, progreso promedio, tareas abiertas, próxima fecha).
- Pestañas Resumen, Proyectos, Pagos (owner), Tareas, Notas y Credenciales (owner).
- Puedo crear/editar proyectos, pagos y tareas desde la ficha con el cliente pre-cargado y bloqueado.

## Proyectos y tareas

**HU-06 — Crear proyecto**
Como miembro quiero crear proyectos asociados a un cliente o internos del estudio para gestionar todo el trabajo en un lugar.
- Cliente opcional (proyectos internos); tipo, estado, fecha de inicio y deadline.
- La fecha de entrega no puede ser anterior al inicio (validado en formulario y en Postgres).

**HU-07 — Presupuesto (owner)**
Como founder quiero cargar presupuesto y moneda por proyecto sin que los colaboradores lo vean.
- Solo `owner` ve y edita presupuesto/moneda; RLS separa `project_financials` de los datos operativos.

**HU-08 — Kanban de tareas**
Como miembro quiero gestionar tareas en un tablero por estado para ver el avance de cada proyecto.
- Estados `todo`, `doing`, `review`, `done`; cambio rápido desde la tarjeta.
- Título obligatorio (máx. 240 caracteres); vencimiento opcional.
- El % de avance del proyecto se calcula como tareas done / total (nunca se guarda).

**HU-09 — Hitos**
Como miembro quiero definir hitos con fecha por etapa para seguir el plan más allá del deadline final.
- Alta, edición y marca de cumplido; eliminación solo `owner`.
- Los hitos vencidos pendientes se marcan en rojo y alimentan la "próxima fecha".

**HU-10 — Detalle de proyecto**
Como miembro quiero una página por proyecto con tareas, hitos, pagos, notas y credenciales para operar sin cambiar de contexto.
- Pestañas Resumen, Tareas, Hitos, Pagos (owner), Notas y Credenciales.
- Edición con proyecto y cliente pre-cargados.

## Finanzas (owner)

**HU-11 — Registrar movimientos**
Como founder quiero registrar ingresos y egresos en ARS, USD o USDT sin que se mezclen monedas para tener un P&L honesto.
- Totales siempre separados por moneda; importes `numeric(20,8)`.
- Estados pendiente/realizado/cancelado; un movimiento realizado exige fecha de cobro o pago.
- Vínculo opcional con cliente y proyecto; deben coincidir entre sí.

**HU-12 — Cuentas por cobrar y pagar**
Como founder quiero ver qué me deben y qué debo, con vencimientos atrasados destacados, para no perder cobros.
- Caja realizada, por cobrar y por pagar separados por moneda.
- Listado de vencimientos atrasados; resultado realizado por proyecto y moneda.

**HU-13 — Pagos recurrentes**
Como founder quiero marcar un cobro como mensual recurrente para que el próximo mes se genere solo.
- Siempre existe el próximo mes como pendiente; se genera hacia adelante al cobrarse (idempotente, por triggers).
- Cada mes es un registro independiente, editable o cancelable; destildar la recurrencia corta la generación futura.
- En meses cortos la fecha cae al último día disponible.

## Calendario

**HU-14 — Reuniones**
Como miembro quiero agendar reuniones vinculadas a uno o varios proyectos para tener la agenda del equipo en el sistema.
- Fecha, hora de inicio, fin opcional, lugar/link, notas y selección de proyectos (muchos-a-muchos).
- Eliminación solo `owner`.

**HU-15 — Vista unificada**
Como miembro quiero ver en un solo calendario reuniones, deadlines, hitos y vencimientos para no perder ninguna fecha.
- Vistas día/semana/mes con navegación; abre en mensual.
- Vencimientos de pagos visibles solo para `owner`; referencia cruzada a cada proyecto.
- El dashboard muestra la agenda del día. Horas en zona horaria de Argentina.

## Bóveda de credenciales (owner)

**HU-16 — Guardar credencial**
Como founder quiero guardar credenciales de clientes cifradas para que nunca existan en claro en la base.
- Servicio, URL y usuario en claro (para listar); contraseña y notas cifradas con AES-256-GCM en una Edge Function.
- IV único por secreto; `key_version` por fila; la llave maestra nunca sale de la función.

**HU-17 — Revelar credencial**
Como founder quiero re-validar mi identidad antes de ver una contraseña para que una sesión abierta no exponga la bóveda.
- Reveal gate: reingreso mi contraseña (step-up auth) con ventana de comodidad de 5 minutos.
- El secreto se muestra 30 segundos con botón de copiar y no se cachea.
- Cada reveal queda en `credential_access_log` (quién, qué, cuándo).

## Notas

**HU-18 — Feed de notas**
Como miembro quiero dejar notas con fecha y autor a nivel cliente o proyecto para registrar contexto.
- Varias notas por cliente; vínculo opcional a un proyecto (validado que pertenezca al cliente).
- Editar y eliminar solo el autor o un `owner` (reforzado por RLS).

## Incremento 1.1 (aprobado, pendiente de desarrollo)

### Archivos .env por proyecto (owner)

**HU-22 — Guardar un .env**
Como founder quiero guardar el contenido de los `.env` de un proyecto cifrado para dejar de pasarlos por canales inseguros.
- Varios archivos por proyecto, cada uno con nombre/entorno (ej.: `.env`, `.env.production`), único por proyecto.
- El contenido se pega como texto completo y se cifra como un solo blob (AES-256-GCM) en una Edge Function; la base solo guarda ciphertext + IV + `key_version`.
- Solo `owner` ve la pestaña "Variables de entorno" del proyecto; RLS refuerza el acceso.

**HU-23 — Revelar un .env**
Como founder quiero re-validar mi identidad antes de ver un `.env` para que una sesión abierta no lo exponga.
- Mismo reveal gate que la bóveda: reingreso de contraseña con ventana de 5 minutos.
- El contenido se muestra con botón de copiar, se oculta solo y no se cachea.
- Cada reveal queda registrado (quién, qué archivo, cuándo).

### Pedidos de features

**HU-24 — Proponer una feature**
Como miembro del equipo quiero proponer mejoras al sistema con título y descripción para que no se pierdan en el chat.
- Cualquier usuario autenticado crea pedidos; el autor puede editar el suyo.
- Listado con filtro por estado; eliminación solo `owner`.

**HU-25 — Gestionar pedidos (owner)**
Como founder quiero cambiar el estado de los pedidos para transparentar qué se hace y qué no.
- Estados: `proposed` → `accepted` → `in_progress` → `done`, o `rejected`; solo `owner` los cambia (UI + RLS).
- Cualquier usuario puede comentar un pedido; los comentarios muestran autor y fecha.

### Portal público de clientes

**HU-26 — Generar link del portal (owner)**
Como founder quiero generar un link privado por cliente para compartirle el estado de la relación comercial sin crearle una cuenta.
- Token único por cliente, guardado hasheado; se muestra completo una sola vez al generarlo.
- Puedo revocarlo y generar uno nuevo; el anterior deja de funcionar al instante.
- Veo fecha de último acceso de cada token.

**HU-27 — Ver el portal (cliente)**
Como cliente quiero ver mis proyectos, pagos y notas en una página simple para saber cómo va mi relación con KOI.
- Acceso solo con el link con token; sin login; solo lectura.
- Proyectos: nombre, estado, % de avance e hitos con fecha.
- Pagos hechos y futuros: **solo fecha, método de pago, moneda y estado — nunca importes**.
- Notas del cliente completas, con fecha.
- Si el token fue revocado o no existe, la página informa acceso no disponible sin filtrar si el cliente existe.

**HU-28 — Método de pago en movimientos (owner)**
Como founder quiero registrar el método de pago de cada movimiento para que el portal pueda mostrarlo.
- Campo opcional en el formulario de movimiento (ej.: transferencia, crypto, efectivo, tarjeta).
- Editable en movimientos existentes; los históricos quedan sin método hasta completarse.

## Roadmap (no implementadas)

**HU-19 — Sincronizar con Google Calendar** *(roadmap)*
Como founder quiero que las reuniones se sincronicen con Google Calendar para tener invitaciones, Meet y recordatorios en el celular.

**HU-20 — P&L consolidado** *(roadmap)*
Como founder quiero un total consolidado en una moneda base con la cotización del día de cada transacción, sin perder los montos originales.

**HU-21 — Rotar la llave maestra** *(roadmap)*
Como founder quiero rotar la llave de la bóveda re-cifrando por lotes (`key_version`) sin cortar el servicio.
