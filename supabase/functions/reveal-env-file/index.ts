// Edge Function: reveal-env-file
// Self-contained (no shared imports) so it can be deployed by pasting this single file
// into the Supabase dashboard editor. Decrypts one .env file after validating an owner JWT
// and records the access in env_file_access_log.
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

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('MASTER_ENCRYPTION_KEY')
  if (!raw) throw new Error('MASTER_ENCRYPTION_KEY is not configured')
  const keyBytes = base64ToBytes(raw)
  if (keyBytes.length !== 32) throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes encoded in base64')
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function decryptSecret(ciphertext: string, iv: string): Promise<string> {
  const key = await getKey()
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: base64ToBytes(iv) }, key, base64ToBytes(ciphertext))
  return new TextDecoder().decode(plaintext)
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405)

  const auth = await requireOwner(req)
  if (!auth.ok) return jsonResponse({ error: auth.message }, auth.status)

  let id: string | undefined
  try {
    id = (await req.json()).id
  } catch {
    return jsonResponse({ error: 'Cuerpo inválido.' }, 400)
  }
  if (!id) return jsonResponse({ error: 'Falta el identificador del archivo.' }, 400)

  const service = serviceClient()
  const { data, error } = await service
    .from('project_env_files')
    .select('content_ciphertext, content_iv')
    .eq('id', id)
    .single()

  if (error || !data) return jsonResponse({ error: 'El archivo no existe.' }, 404)

  try {
    const content = await decryptSecret(data.content_ciphertext, data.content_iv)
    await service.from('env_file_access_log').insert({ env_file_id: id, user_id: auth.userId })
    return jsonResponse({ content })
  } catch (decryptError) {
    return jsonResponse({ error: decryptError instanceof Error ? decryptError.message : 'No se pudo descifrar.' }, 500)
  }
})
