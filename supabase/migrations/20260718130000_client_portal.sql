-- Koi Office — public client portal
-- Bearer-token access: each client can have one active secret link. Only the SHA-256
-- hash of the token is stored; the plain token is shown once to the owner. The public
-- page never touches these tables directly — the get-client-portal Edge Function
-- (service role) validates the token and returns a curated payload without amounts.
-- Also adds the payment_method column that the portal displays instead of amounts.

create type public.financial_payment_method as enum (
  'transfer',
  'crypto',
  'cash',
  'card',
  'other'
);

alter table public.financial_movements
  add column payment_method public.financial_payment_method;

create table public.client_portal_tokens (
  id uuid primary key default extensions.gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  last_accessed_at timestamptz
);

-- One active (non-revoked) token per client.
create unique index client_portal_tokens_active_client_idx
  on public.client_portal_tokens(client_id)
  where revoked_at is null;

create index client_portal_tokens_client_id_idx on public.client_portal_tokens(client_id);

alter table public.client_portal_tokens enable row level security;

-- Owners manage tokens; the Edge Function reads/updates them with the service role.
create policy "Owners can read portal tokens"
  on public.client_portal_tokens for select
  to authenticated
  using ((select private.is_owner()));
create policy "Owners can create portal tokens"
  on public.client_portal_tokens for insert
  to authenticated
  with check ((select private.is_owner()) and created_by = (select auth.uid()));
create policy "Owners can update portal tokens"
  on public.client_portal_tokens for update
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

revoke all on public.client_portal_tokens from anon;
grant select, insert, update on public.client_portal_tokens to authenticated;
