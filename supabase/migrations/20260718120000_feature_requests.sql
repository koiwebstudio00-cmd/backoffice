-- Koi Office — feature requests
-- Internal channel to propose improvements to the system itself. Any team member can
-- create requests and comment; only owners can change the status or delete. The author
-- can edit the title/description of their own request.

create type public.feature_request_status as enum (
  'proposed',
  'accepted',
  'in_progress',
  'done',
  'rejected'
);

create table public.feature_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 160),
  description text check (description is null or char_length(trim(description)) <= 4000),
  status public.feature_request_status not null default 'proposed',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feature_request_comments (
  id uuid primary key default extensions.gen_random_uuid(),
  feature_request_id uuid not null references public.feature_requests(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 4000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index feature_requests_status_created_at_idx
  on public.feature_requests(status, created_at desc);
create index feature_requests_created_by_idx on public.feature_requests(created_by);
create index feature_request_comments_request_id_created_at_idx
  on public.feature_request_comments(feature_request_id, created_at);

-- Only owners can change the status; authors may edit their own title/description.
create function private.protect_feature_request_status()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status and not (select private.is_owner()) then
    raise exception 'Only owners can change the status of a feature request.';
  end if;
  return new;
end;
$$;

revoke all on function private.protect_feature_request_status() from public, anon, authenticated;

create trigger feature_requests_protect_status
  before update of status on public.feature_requests
  for each row execute function private.protect_feature_request_status();

create trigger feature_requests_set_updated_at
  before update on public.feature_requests
  for each row execute function private.set_updated_at();

create trigger feature_requests_preserve_created_by
  before update on public.feature_requests
  for each row execute function private.preserve_created_by();

alter table public.feature_requests enable row level security;
alter table public.feature_request_comments enable row level security;

create policy "Team can read feature requests"
  on public.feature_requests for select
  to authenticated
  using ((select private.is_team_member()));
create policy "Team can create feature requests"
  on public.feature_requests for insert
  to authenticated
  with check ((select private.is_team_member()) and created_by = (select auth.uid()));
create policy "Authors or owners can update feature requests"
  on public.feature_requests for update
  to authenticated
  using (created_by = (select auth.uid()) or (select private.is_owner()))
  with check (created_by = (select auth.uid()) or (select private.is_owner()));
create policy "Owners can delete feature requests"
  on public.feature_requests for delete
  to authenticated
  using ((select private.is_owner()));

create policy "Team can read feature request comments"
  on public.feature_request_comments for select
  to authenticated
  using ((select private.is_team_member()));
create policy "Team can create feature request comments"
  on public.feature_request_comments for insert
  to authenticated
  with check ((select private.is_team_member()) and created_by = (select auth.uid()));
create policy "Authors or owners can delete feature request comments"
  on public.feature_request_comments for delete
  to authenticated
  using (created_by = (select auth.uid()) or (select private.is_owner()));

revoke all on public.feature_requests from anon;
revoke all on public.feature_request_comments from anon;
grant select, insert, update, delete on public.feature_requests to authenticated;
grant select, insert, delete on public.feature_request_comments to authenticated;
