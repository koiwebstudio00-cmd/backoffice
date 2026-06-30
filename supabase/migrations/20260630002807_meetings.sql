-- Koi Office — meetings
-- Internal meetings stored in our own database. A meeting can relate to several projects
-- (many-to-many) or to none. Google Calendar sync is left for a later increment.

create table public.meetings (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint meetings_ends_after_starts check (ends_at is null or ends_at >= starts_at)
);

create table public.meeting_projects (
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  primary key (meeting_id, project_id)
);

create index meetings_starts_at_idx on public.meetings(starts_at);
create index meetings_created_by_idx on public.meetings(created_by);
create index meeting_projects_project_id_idx on public.meeting_projects(project_id);

create trigger meetings_set_updated_at
  before update on public.meetings
  for each row execute function private.set_updated_at();

create trigger meetings_preserve_created_by
  before update on public.meetings
  for each row execute function private.preserve_created_by();

alter table public.meetings enable row level security;
alter table public.meeting_projects enable row level security;

create policy "Team can read meetings"
  on public.meetings for select
  to authenticated
  using ((select private.is_team_member()));
create policy "Team can create meetings"
  on public.meetings for insert
  to authenticated
  with check ((select private.is_team_member()) and created_by = (select auth.uid()));
create policy "Team can update meetings"
  on public.meetings for update
  to authenticated
  using ((select private.is_team_member()))
  with check ((select private.is_team_member()));
create policy "Owners can delete meetings"
  on public.meetings for delete
  to authenticated
  using ((select private.is_owner()));

create policy "Team can read meeting projects"
  on public.meeting_projects for select
  to authenticated
  using ((select private.is_team_member()));
create policy "Team can link meeting projects"
  on public.meeting_projects for insert
  to authenticated
  with check ((select private.is_team_member()));
create policy "Team can unlink meeting projects"
  on public.meeting_projects for delete
  to authenticated
  using ((select private.is_team_member()));

revoke all on public.meetings from anon;
revoke all on public.meeting_projects from anon;
grant select, insert, update, delete on public.meetings to authenticated;
grant select, insert, delete on public.meeting_projects to authenticated;
