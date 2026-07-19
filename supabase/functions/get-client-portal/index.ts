// Edge Function: get-client-portal
// Self-contained (no shared imports) so it can be deployed by pasting this single file
// into the Supabase dashboard editor. The only anonymous entry point of the system:
// validates a bearer portal token (SHA-256 hash lookup), records the access and returns
// a curated read-only payload — projects with derived progress and milestones, payments
// WITHOUT amounts (only date, method, currency, status) and the client's notes.
// Responds identically for unknown and revoked tokens to avoid leaking client existence.
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

function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'Método no permitido.' }, 405)

  let token: string | undefined
  try {
    token = (await req.json()).token
  } catch {
    return jsonResponse({ error: 'Cuerpo inválido.' }, 400)
  }
  if (!token || typeof token !== 'string' || token.length < 20 || token.length > 200) {
    return jsonResponse({ error: 'Acceso no disponible.' }, 404)
  }

  const service = serviceClient()
  const tokenHash = await sha256Hex(token)

  const { data: tokenRow } = await service
    .from('client_portal_tokens')
    .select('id, client_id')
    .eq('token_hash', tokenHash)
    .is('revoked_at', null)
    .maybeSingle()

  if (!tokenRow) return jsonResponse({ error: 'Acceso no disponible.' }, 404)

  const [clientResult, projectsResult, movementsResult, notesResult] = await Promise.all([
    service.from('clients').select('name, company').eq('id', tokenRow.client_id).single(),
    service
      .from('projects')
      .select('id, name, type, status, start_date, deadline, tasks(status), milestones(title, due_date, done)')
      .eq('client_id', tokenRow.client_id)
      .order('created_at', { ascending: true }),
    service
      .from('financial_movements')
      .select('type, status, currency, payment_method, occurred_on, due_date, settled_on')
      .eq('client_id', tokenRow.client_id)
      .neq('status', 'cancelled')
      .eq('type', 'income')
      .order('occurred_on', { ascending: false })
      .limit(120),
    service
      .from('notes')
      .select('body, created_at, project_id')
      .eq('client_id', tokenRow.client_id)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (clientResult.error || !clientResult.data) return jsonResponse({ error: 'Acceso no disponible.' }, 404)

  await service
    .from('client_portal_tokens')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', tokenRow.id)

  const projects = (projectsResult.data ?? []).map((project) => {
    const tasks = (project.tasks ?? []) as { status: string }[]
    const total = tasks.length
    const done = tasks.filter((task) => task.status === 'done').length
    return {
      id: project.id,
      name: project.name,
      type: project.type,
      status: project.status,
      startDate: project.start_date,
      deadline: project.deadline,
      progress: total > 0 ? Math.round((done / total) * 100) : 0,
      milestones: ((project.milestones ?? []) as { title: string; due_date: string; done: boolean }[])
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .map((milestone) => ({ title: milestone.title, dueDate: milestone.due_date, done: milestone.done })),
    }
  })

  // Curated on purpose: no amounts, no categories, no internal notes fields.
  const payments = (movementsResult.data ?? []).map((movement) => ({
    status: movement.status,
    currency: movement.currency,
    paymentMethod: movement.payment_method,
    occurredOn: movement.occurred_on,
    dueDate: movement.due_date,
    settledOn: movement.settled_on,
  }))

  const projectNameById = new Map(projects.map((project) => [project.id, project.name]))
  const notes = (notesResult.data ?? []).map((note) => ({
    body: note.body,
    createdAt: note.created_at,
    projectName: note.project_id ? projectNameById.get(note.project_id) ?? null : null,
  }))

  return jsonResponse({
    client: { name: clientResult.data.company || clientResult.data.name },
    projects,
    payments,
    notes,
  })
})
