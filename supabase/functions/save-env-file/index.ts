// Edge Function: save-env-file
// Self-contained (no shared imports) so it can be deployed by pasting this single file
// into the Supabase dashboard editor. Encrypts the full .env content with AES-256-GCM using
// the MASTER_ENCRYPTION_KEY secret; the key never leaves this runtime.
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
  if (!profile || profile.role !== 'owner') return { ok: false, status: 403, message: 'Solo los owners pueden acceder a las variables de entorno.' }
  return { ok: true, userId: user.id }
}

interface SavePayload {
  id?: string
  projectId?: string
  name?: string
  content?: string
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

  const name = payload.name?.trim()
  if (!name) return jsonResponse({ error: 'El nombre del archivo es obligatorio.' }, 400)

  const service = serviceClient()

  try {
    if (payload.id) {
      const update: Record<string, unknown> = { name }
      if (payload.content !== undefined) {
        if (!payload.content.trim()) return jsonResponse({ error: 'El contenido no puede quedar vacío.' }, 400)
        const encrypted = await encryptSecret(payload.content)
        update.content_ciphertext = encrypted.ciphertext
        update.content_iv = encrypted.iv
      }
      const { error } = await service.from('project_env_files').update(update).eq('id', payload.id)
      if (error) throw error
    } else {
      if (!payload.projectId) return jsonResponse({ error: 'Falta el proyecto.' }, 400)
      if (!payload.content?.trim()) return jsonResponse({ error: 'El contenido es obligatorio.' }, 400)

      const encrypted = await encryptSecret(payload.content)
      const { error } = await service.from('project_env_files').insert({
        project_id: payload.projectId,
        name,
        content_ciphertext: encrypted.ciphertext,
        content_iv: encrypted.iv,
        key_version: 1,
        created_by: auth.userId,
      })
      if (error) throw error
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo guardar.'
    const isDuplicate = message.includes('project_env_files_name_unique')
    return jsonResponse({ error: isDuplicate ? 'Ya existe un archivo con ese nombre en este proyecto.' : message }, isDuplicate ? 409 : 500)
  }

  return jsonResponse({ ok: true })
})
