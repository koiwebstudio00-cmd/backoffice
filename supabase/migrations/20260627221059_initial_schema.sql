-- Koi Office — foundational schema
-- Internal, single-tenant back office. Authorization data lives in public.profiles,
-- never in user-editable JWT metadata.

create extension if not exists pgcrypto with schema extensions;

create type public.team_role as enum ('owner', 'member');
create type public.client_status as enum ('lead', 'active', 'paused', 'closed');
create type public.project_status as enum ('active', 'paused', 'done');
create type public.task_status as enum ('todo', 'doing', 'review', 'done');

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 1 and 120),
  role public.team_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  company text,
  email text,
  phone text,
  status public.client_status not null default 'lead',
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default extensions.gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null check (char_length(trim(name)) between 1 and 160),
  type text not null check (char_length(trim(type)) between 1 and 80),
  status public.project_status not null default 'active',
  start_date date,
  deadline date,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_dates_are_valid
    check (deadline is null or start_date is null or deadline >= start_date)
);

-- Financial columns are separated so members can read projects without seeing budgets.
create table public.project_financials (
  project_id uuid primary key references public.projects(id) on delete cascade,
  budget numeric(18, 2) not null check (budget >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  status public.task_status not null default 'todo',
  due_date date,
  position integer not null default 0 check (position >= 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index clients_status_idx on public.clients(status);
create index clients_created_by_idx on public.clients(created_by);
create index projects_client_id_idx on public.projects(client_id);
create index projects_status_idx on public.projects(status);
create index projects_deadline_idx on public.projects(deadline) where deadline is not null;
create index projects_created_by_idx on public.projects(created_by);
create index tasks_project_status_position_idx
  on public.tasks(project_id, status, position);
create index tasks_due_date_idx on public.tasks(due_date) where due_date is not null;
create index tasks_created_by_idx on public.tasks(created_by);

create function private.is_team_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
  );
$$;

create function private.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'owner'
  );
$$;

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Miembro'
    ),
    'member'
  );
  return new;
end;
$$;

create function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create function private.preserve_created_by()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.created_by = old.created_by;
  return new;
end;
$$;

revoke all on function private.is_team_member() from public;
revoke all on function private.is_owner() from public;
revoke all on function private.handle_new_user() from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.preserve_created_by() from public;
grant execute on function private.is_team_member() to authenticated;
grant execute on function private.is_owner() to authenticated;
grant usage on schema private to authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function private.set_updated_at();
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function private.set_updated_at();
create trigger project_financials_set_updated_at
  before update on public.project_financials
  for each row execute function private.set_updated_at();
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function private.set_updated_at();

create trigger clients_preserve_created_by
  before update on public.clients
  for each row execute function private.preserve_created_by();
create trigger projects_preserve_created_by
  before update on public.projects
  for each row execute function private.preserve_created_by();
create trigger tasks_preserve_created_by
  before update on public.tasks
  for each row execute function private.preserve_created_by();

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_financials enable row level security;
alter table public.tasks enable row level security;

create policy "Team can read profiles"
  on public.profiles for select
  to authenticated
  using ((select private.is_team_member()));

create policy "Owners can update profiles"
  on public.profiles for update
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));

create policy "Team can read clients"
  on public.clients for select
  to authenticated
  using ((select private.is_team_member()));
create policy "Team can create clients"
  on public.clients for insert
  to authenticated
  with check ((select private.is_team_member()) and created_by = (select auth.uid()));
create policy "Team can update clients"
  on public.clients for update
  to authenticated
  using ((select private.is_team_member()))
  with check ((select private.is_team_member()));
create policy "Owners can delete clients"
  on public.clients for delete
  to authenticated
  using ((select private.is_owner()));

create policy "Team can read projects"
  on public.projects for select
  to authenticated
  using ((select private.is_team_member()));
create policy "Team can create projects"
  on public.projects for insert
  to authenticated
  with check ((select private.is_team_member()) and created_by = (select auth.uid()));
create policy "Team can update projects"
  on public.projects for update
  to authenticated
  using ((select private.is_team_member()))
  with check ((select private.is_team_member()));
create policy "Owners can delete projects"
  on public.projects for delete
  to authenticated
  using ((select private.is_owner()));

create policy "Owners can read project financials"
  on public.project_financials for select
  to authenticated
  using ((select private.is_owner()));
create policy "Owners can create project financials"
  on public.project_financials for insert
  to authenticated
  with check ((select private.is_owner()));
create policy "Owners can update project financials"
  on public.project_financials for update
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
create policy "Owners can delete project financials"
  on public.project_financials for delete
  to authenticated
  using ((select private.is_owner()));

create policy "Team can read tasks"
  on public.tasks for select
  to authenticated
  using ((select private.is_team_member()));
create policy "Team can create tasks"
  on public.tasks for insert
  to authenticated
  with check ((select private.is_team_member()) and created_by = (select auth.uid()));
create policy "Team can update tasks"
  on public.tasks for update
  to authenticated
  using ((select private.is_team_member()))
  with check ((select private.is_team_member()));
create policy "Owners can delete tasks"
  on public.tasks for delete
  to authenticated
  using ((select private.is_owner()));

create view public.project_progress
with (security_invoker = true)
as
select
  p.id as project_id,
  count(t.id)::integer as total_tasks,
  count(t.id) filter (where t.status = 'done')::integer as completed_tasks,
  case
    when count(t.id) = 0 then 0
    else round(
      (count(t.id) filter (where t.status = 'done')::numeric / count(t.id)::numeric) * 100
    )::integer
  end as progress_percentage
from public.projects p
left join public.tasks t on t.project_id = p.id
group by p.id;

revoke all on public.profiles from anon;
revoke all on public.clients from anon;
revoke all on public.projects from anon;
revoke all on public.project_financials from anon;
revoke all on public.tasks from anon;
revoke all on public.project_progress from anon;

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.projects to authenticated;
grant select, insert, update, delete on public.project_financials to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select on public.project_progress to authenticated;
