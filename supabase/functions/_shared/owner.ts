import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )
}

type OwnerResult =
  | { ok: true; userId: string }
  | { ok: false; status: number; message: string }

// Validates the caller's JWT and confirms the owner role before any sensitive operation.
export async function requireOwner(req: Request): Promise<OwnerResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return { ok: false, status: 401, message: 'Falta el token de autenticación.' }

  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  )

  const { data: { user }, error } = await userClient.auth.getUser()
  if (error || !user) return { ok: false, status: 401, message: 'Sesión inválida.' }

  const { data: profile } = await serviceClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'owner') {
    return { ok: false, status: 403, message: 'Solo los owners pueden acceder a la bóveda.' }
  }

  return { ok: true, userId: user.id }
}
