-- Koi Office — notes feed
-- Operational notes attached to a client (and optionally a project). Visible to the
-- whole team; only the author or an owner can edit or delete a given note.

create table public.notes (
  id uuid primary key default extensions.gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_client_id_created_at_idx
  on public.notes(client_id, created_at desc);
create index notes_project_id_idx
  on public.notes(project_id)
  where project_id is not null;
create index notes_created_by_idx on public.notes(created_by);

-- Keep the note's project consistent with its client: a note linked to a project
-- must belong to that project's client.
create function private.validate_note_links()
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

  select client_id
  into project_client_id
  from public.projects
  where id = new.project_id;

  if project_client_id is null then
    raise exception 'The selected project does not exist or is not accessible.';
  end if;

  if new.client_id <> project_client_id then
    raise exception 'The note client does not match the project client.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_note_links() from public, anon, authenticated;

create trigger notes_validate_links
  before insert or update of client_id, project_id on public.notes
  for each row execute function private.validate_note_links();

create trigger notes_set_updated_at
  before update on public.notes
  for each row execute function private.set_updated_at();

create trigger notes_preserve_created_by
  before update on public.notes
  for each row execute function private.preserve_created_by();

alter table public.notes enable row level security;

create policy "Team can read notes"
  on public.notes for select
  to authenticated
  using ((select private.is_team_member()));
create policy "Team can create notes"
  on public.notes for insert
  to authenticated
  with check ((select private.is_team_member()) and created_by = (select auth.uid()));
create policy "Authors or owners can update notes"
  on public.notes for update
  to authenticated
  using (created_by = (select auth.uid()) or (select private.is_owner()))
  with check (created_by = (select auth.uid()) or (select private.is_owner()));
create policy "Authors or owners can delete notes"
  on public.notes for delete
  to authenticated
  using (created_by = (select auth.uid()) or (select private.is_owner()));

revoke all on public.notes from anon;
grant select, insert, update, delete on public.notes to authenticated;
