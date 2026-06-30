-- Koi Office — project milestones
-- Dated stages of a project's development, separate from its single final deadline
-- (projects.deadline) and from tasks. Visible to the whole team; deletion is owner-only,
-- matching the tasks model.

create table public.milestones (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  due_date date not null,
  done boolean not null default false,
  position integer not null default 0 check (position >= 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index milestones_project_due_date_idx
  on public.milestones(project_id, due_date);
create index milestones_due_date_idx on public.milestones(due_date);
create index milestones_created_by_idx on public.milestones(created_by);

create trigger milestones_set_updated_at
  before update on public.milestones
  for each row execute function private.set_updated_at();

create trigger milestones_preserve_created_by
  before update on public.milestones
  for each row execute function private.preserve_created_by();

alter table public.milestones enable row level security;

create policy "Team can read milestones"
  on public.milestones for select
  to authenticated
  using ((select private.is_team_member()));
create policy "Team can create milestones"
  on public.milestones for insert
  to authenticated
  with check ((select private.is_team_member()) and created_by = (select auth.uid()));
create policy "Team can update milestones"
  on public.milestones for update
  to authenticated
  using ((select private.is_team_member()))
  with check ((select private.is_team_member()));
create policy "Owners can delete milestones"
  on public.milestones for delete
  to authenticated
  using ((select private.is_owner()));

revoke all on public.milestones from anon;
grant select, insert, update, delete on public.milestones to authenticated;
