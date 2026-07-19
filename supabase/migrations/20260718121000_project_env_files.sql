-- Koi Office — project .env files (server-side encryption, same model as the vault)
-- Stores the full content of a project's .env files as a single encrypted blob.
-- The database only ever sees ciphertext; the master key lives as an Edge Function
-- secret and encryption/decryption happens only inside save-env-file / reveal-env-file.
-- Owners only, with an append-only access log written by the reveal Edge Function.

create table public.project_env_files (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  content_ciphertext text not null,
  content_iv text not null,
  key_version integer not null default 1 check (key_version >= 1),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_env_files_name_unique unique (project_id, name)
);

create table public.env_file_access_log (
  id uuid primary key default extensions.gen_random_uuid(),
  env_file_id uuid not null references public.project_env_files(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  accessed_at timestamptz not null default now()
);

create index project_env_files_project_id_idx on public.project_env_files(project_id);
create index env_file_access_log_env_file_id_idx on public.env_file_access_log(env_file_id);

create trigger project_env_files_set_updated_at
  before update on public.project_env_files
  for each row execute function private.set_updated_at();

create trigger project_env_files_preserve_created_by
  before update on public.project_env_files
  for each row execute function private.preserve_created_by();

alter table public.project_env_files enable row level security;
alter table public.env_file_access_log enable row level security;

-- Owners only. The Edge Functions use the service role for encrypt/decrypt.
create policy "Owners can read env files"
  on public.project_env_files for select
  to authenticated
  using ((select private.is_owner()));
create policy "Owners can create env files"
  on public.project_env_files for insert
  to authenticated
  with check ((select private.is_owner()) and created_by = (select auth.uid()));
create policy "Owners can update env files"
  on public.project_env_files for update
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
create policy "Owners can delete env files"
  on public.project_env_files for delete
  to authenticated
  using ((select private.is_owner()));

-- Owners can read the audit log; rows are only written by the Edge Function (service role).
create policy "Owners can read env access log"
  on public.env_file_access_log for select
  to authenticated
  using ((select private.is_owner()));

revoke all on public.project_env_files from anon;
revoke all on public.env_file_access_log from anon, authenticated;
grant select, insert, update, delete on public.project_env_files to authenticated;
grant select on public.env_file_access_log to authenticated;
