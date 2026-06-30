# Bóveda de credenciales — despliegue

La Bóveda usa el modelo **Opción A** de `project.md`: cifrado del lado servidor con AES-256-GCM dentro de Edge Functions. La base solo guarda texto cifrado; la llave maestra vive como secret de Supabase y nunca toca Postgres.

Para que funcione en el proyecto remoto hay tres pasos, todos por fuera de la app.

## 1. Aplicar la migración

```bash
supabase db push
# o aplicar manualmente 20260630022302_credentials.sql
```

Crea `credentials` (con su ciphertext, iv y key_version) y `credential_access_log`, ambas con RLS exclusiva de `owner`.

## 2. Generar y cargar la llave maestra

La llave es de 32 bytes (AES-256) en base64. Generala y guardala como secret de las Edge Functions:

```bash
# generar una llave (guardala también en un gestor seguro)
openssl rand -base64 32

# cargarla como secret del proyecto
supabase secrets set MASTER_ENCRYPTION_KEY="<la-llave-base64>"
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` ya las inyecta Supabase automáticamente en las funciones.

## 3. Desplegar las Edge Functions

```bash
supabase functions deploy save-credential
supabase functions deploy reveal-credential
```

- `save-credential`: valida el JWT, confirma rol `owner`, genera un IV nuevo por secreto, cifra con AES-256-GCM y guarda ciphertext + iv. La llave nunca sale de la función.
- `reveal-credential`: valida el JWT y el rol, descifra ese secreto puntual, lo devuelve una sola vez y deja registro en `credential_access_log`.

## Flujo en la app

- Las credenciales se gestionan desde la pestaña **Credenciales** de la ficha de cliente y de la página de proyecto (solo `owner`).
- Al **revelar**, la app pide reingresar la contraseña del usuario (`signInWithPassword`, step-up auth). Esa re-validación queda válida **5 minutos** (ajustable en `REVALIDATION_WINDOW_MS` de `CredentialsPanel.tsx`).
- El secreto revelado se muestra con botón de copiar y se **oculta solo a los 30 segundos**; no se cachea en el navegador.
- Cada reveal queda registrado en el log de accesos (quién, qué, cuándo).

## Defensa principal

Como en la Opción A el servidor técnicamente puede descifrar, la primera línea de defensa es que nadie entre al proyecto de Supabase: **MFA obligatorio** en las cuentas de ambos founders, RLS estricta y cuidado con la service key.

## Rotación de llave (futuro)

`key_version` queda versionado por fila para poder rotar la `MASTER_ENCRYPTION_KEY` re-cifrando fila por fila sin romper lo viejo. No está automatizado todavía.
