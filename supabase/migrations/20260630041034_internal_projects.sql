-- Koi Office — internal projects
-- A project can belong to a client OR be an internal studio project (own SaaS platforms like
-- Toki/Aido) with no client. Notes and credentials can therefore also belong to a project
-- without a client; each must still anchor to at least a client or a project.

alter table public.projects alter column client_id drop not null;

alter table public.notes alter column client_id drop not null;
alter table public.notes
  add constraint notes_anchor_present check (client_id is not null or project_id is not null);

alter table public.credentials alter column client_id drop not null;
alter table public.credentials
  add constraint credentials_anchor_present check (client_id is not null or project_id is not null);

-- Generic rule for movement/note/credential project links: a linked project must exist; if it
-- has a client, the row's client must match (or be inherited); internal projects (no client)
-- are allowed and leave the client untouched.

create or replace function private.validate_financial_movement_links()
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

  if not found then
    raise exception 'The selected project does not exist or is not accessible.';
  end if;

  if project_client_id is not null then
    if new.client_id is null then
      new.client_id := project_client_id;
    elsif new.client_id <> project_client_id then
      raise exception 'The selected client does not match the project client.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.validate_note_links()
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

  if not found then
    raise exception 'The selected project does not exist or is not accessible.';
  end if;

  if project_client_id is not null then
    if new.client_id is null then
      new.client_id := project_client_id;
    elsif new.client_id <> project_client_id then
      raise exception 'The note client does not match the project client.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.validate_credential_links()
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

  if not found then
    raise exception 'The selected project does not exist or is not accessible.';
  end if;

  if project_client_id is not null then
    if new.client_id is null then
      new.client_id := project_client_id;
    elsif new.client_id <> project_client_id then
      raise exception 'The credential client does not match the project client.';
    end if;
  end if;

  return new;
end;
$$;
