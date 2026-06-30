// Edge Function: save-credential
// Self-contained (no shared imports) so it can be deployed by pasting this single file
// into the Supabase dashboard editor. Encrypts the secret/notes with AES-256-GCM using the
// MASTER_ENCRYPTION_KEY secret; the key never leaves this runtime.
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('MASTER_ENCRYPTION_KEY')
  if (!raw) throw new Error('MASTER_ENCRYPTION_KEY is not configured')
  const keyBytes = base64ToBytes(raw)
  if (keyBytes.length !== 32) throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes encoded in base64')
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encryptSecret(plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) }
}

function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
}

type OwnerResult = { ok: true; userId: string } | { ok: false; status: number; message: string }

async function requireOwner(req: Request): Promise<OwnerResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { ok: false, status: 401, message: 'Falta el token de autenticación.' }
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return { ok: false, status: 401, message: 'Sesión inválida.' }
  const { data: profile } = await serviceClient().from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'owner') return { ok: false, status: 403, message: 'Solo los owners pueden acceder a la bóveda.' }
  return { ok: true, userId: user.id }
}

interface SavePayload {
  id?: string
  clientId?: string
  projectId?: string | null
  serviceName?: string
  serviceUrl?: string | null
  username?: string | null
  secret?: string
  notes?: string | null
}

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405)

  const auth = await requireOwner(req)
  if (!auth.ok) return jsonResponse({ error: auth.message }, auth.status)

  let payload: SavePayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Cuerpo inválido.' }, 400)
  }

  const serviceName = clean(payload.serviceName)
  if (!serviceName) return jsonResponse({ error: 'El nombre del servicio es obligatorio.' }, 400)

  const service = serviceClient()

  try {
    if (payload.id) {
      const update: Record<string, unknown> = {
        client_id: clean(payload.clientId ?? null),
        project_id: clean(payload.projectId ?? null),
        service_name: serviceName,
        service_url: clean(payload.serviceUrl ?? null),
        username: clean(payload.username ?? null),
      }
      if (payload.secret) {
        const encrypted = await encryptSecret(payload.secret)
        update.secret_ciphertext = encrypted.ciphertext
        update.secret_iv = encrypted.iv
      }
      if (payload.notes !== undefined) {
        const notes = clean(payload.notes)
        if (notes) {
          const encrypted = await encryptSecret(notes)
          update.notes_ciphertext = encrypted.ciphertext
          update.notes_iv = encrypted.iv
        } else {
          update.notes_ciphertext = null
          update.notes_iv = null
        }
      }
      const { error } = await service.from('credentials').update(update).eq('id', payload.id)
      if (error) throw error
    } else {
      if (!payload.clientId && !payload.projectId) return jsonResponse({ error: 'Asociá la credencial a un cliente o a un proyecto.' }, 400)
      if (!payload.secret) return jsonResponse({ error: 'La contraseña es obligatoria.' }, 400)

      const encrypted = await encryptSecret(payload.secret)
      const row: Record<string, unknown> = {
        client_id: clean(payload.clientId ?? null),
        project_id: clean(payload.projectId ?? null),
        service_name: serviceName,
        service_url: clean(payload.serviceUrl ?? null),
        username: clean(payload.username ?? null),
        secret_ciphertext: encrypted.ciphertext,
        secret_iv: encrypted.iv,
        key_version: 1,
        created_by: auth.userId,
      }
      const notes = clean(payload.notes)
      if (notes) {
        const encryptedNotes = await encryptSecret(notes)
        row.notes_ciphertext = encryptedNotes.ciphertext
        row.notes_iv = encryptedNotes.iv
      }
      const { error } = await service.from('credentials').insert(row)
      if (error) throw error
    }
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'No se pudo guardar.' }, 500)
  }

  return jsonResponse({ ok: true })
})
