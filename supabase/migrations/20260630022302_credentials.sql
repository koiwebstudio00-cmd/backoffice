-- Koi Office — credentials vault (Option A: server-side encryption)
-- The database only ever stores ciphertext. The master key lives outside the database
-- (Edge Function secret) and decryption happens only inside the reveal Edge Function after
-- re-validating the user. RLS restricts everything to owners; the access log is append-only
-- and written by the Edge Function via the service role.

create table public.credentials (
  id uuid primary key default extensions.gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  service_name text not null check (char_length(trim(service_name)) between 1 and 160),
  service_url text,
  username text,
  secret_ciphertext text not null,
  secret_iv text not null,
  notes_ciphertext text,
  notes_iv text,
  key_version integer not null default 1 check (key_version >= 1),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credential_access_log (
  id uuid primary key default extensions.gen_random_uuid(),
  credential_id uuid not null references public.credentials(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  accessed_at timestamptz not null default now()
);

create index credentials_client_id_idx on public.credentials(client_id);
create index credentials_project_id_idx on public.credentials(project_id) where project_id is not null;
create index credential_access_log_credential_id_idx on public.credential_access_log(credential_id);

-- Keep the credential's project consistent with its client.
create function private.validate_credential_links()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  project_client_id uuid;
begin
  if new.project_id is null then
    return new;
  end if;

  select client_id into project_client_id
  from public.projects
  where id = new.project_id;

  if project_client_id is null then
    raise exception 'The selected project does not exist or is not accessible.';
  end if;

  if new.client_id <> project_client_id then
    raise exception 'The credential client does not match the project client.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_credential_links() from public, anon, authenticated;

create trigger credentials_validate_links
  before insert or update of client_id, project_id on public.credentials
  for each row execute function private.validate_credential_links();

create trigger credentials_set_updated_at
  before update on public.credentials
  for each row execute function private.set_updated_at();

create trigger credentials_preserve_created_by
  before update on public.credentials
  for each row execute function private.preserve_created_by();

alter table public.credentials enable row level security;
alter table public.credential_access_log enable row level security;

-- Owners only. The Edge Functions use the service role and bypass RLS for encrypt/decrypt.
create policy "Owners can read credentials"
  on public.credentials for select
  to authenticated
  using ((select private.is_owner()));
create policy "Owners can create credentials"
  on public.credentials for insert
  to authenticated
  with check ((select private.is_owner()) and created_by = (select auth.uid()));
create policy "Owners can update credentials"
  on public.credentials for update
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
create policy "Owners can delete credentials"
  on public.credentials for delete
  to authenticated
  using ((select private.is_owner()));

-- Owners can read the audit log; rows are only written by the Edge Function (service role).
create policy "Owners can read access log"
  on public.credential_access_log for select
  to authenticated
  using ((select private.is_owner()));

revoke all on public.credentials from anon;
revoke all on public.credential_access_log from anon, authenticated;
grant select, insert, update, delete on public.credentials to authenticated;
grant select on public.credential_access_log to authenticated;
