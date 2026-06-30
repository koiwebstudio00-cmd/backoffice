-- Koi Office — finance module
-- Owner-only cash movements. Amounts remain separated by currency; no implicit FX conversion.

create type public.financial_movement_type as enum ('income', 'expense');
create type public.financial_movement_status as enum ('pending', 'settled', 'cancelled');

alter table public.project_financials
  drop constraint if exists project_financials_currency_check;
alter table public.project_financials
  add constraint project_financials_currency_check
  check (currency in ('ARS', 'USD', 'USDT'));

create table public.financial_movements (
  id uuid primary key default extensions.gen_random_uuid(),
  type public.financial_movement_type not null,
  status public.financial_movement_status not null default 'pending',
  concept text not null check (char_length(trim(concept)) between 1 and 160),
  category text not null check (char_length(trim(category)) between 1 and 80),
  amount numeric(20, 8) not null check (amount > 0),
  currency text not null check (currency in ('ARS', 'USD', 'USDT')),
  occurred_on date not null default current_date,
  due_date date,
  settled_on date,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  notes text,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_movements_settlement_is_valid check (
    (status = 'settled' and settled_on is not null)
    or (status <> 'settled' and settled_on is null)
  )
);

create index financial_movements_currency_occurred_on_idx
  on public.financial_movements(currency, occurred_on desc);
create index financial_movements_status_due_date_idx
  on public.financial_movements(status, due_date)
  where status = 'pending' and due_date is not null;
create index financial_movements_client_id_idx
  on public.financial_movements(client_id)
  where client_id is not null;
create index financial_movements_project_id_idx
  on public.financial_movements(project_id)
  where project_id is not null;
create index financial_movements_created_by_idx
  on public.financial_movements(created_by);

create function private.validate_financial_movement_links()
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

  if new.client_id is null then
    new.client_id := project_client_id;
  elsif new.client_id <> project_client_id then
    raise exception 'The selected client does not match the project client.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_financial_movement_links() from public, anon, authenticated;

create trigger financial_movements_validate_links
  before insert or update of client_id, project_id on public.financial_movements
  for each row execute function private.validate_financial_movement_links();

create trigger financial_movements_set_updated_at
  before update on public.financial_movements
  for each row execute function private.set_updated_at();

create trigger financial_movements_preserve_created_by
  before update on public.financial_movements
  for each row execute function private.preserve_created_by();

alter table public.financial_movements enable row level security;

create policy "Owners can read financial movements"
  on public.financial_movements for select
  to authenticated
  using ((select private.is_owner()));
create policy "Owners can create financial movements"
  on public.financial_movements for insert
  to authenticated
  with check ((select private.is_owner()) and created_by = (select auth.uid()));
create policy "Owners can update financial movements"
  on public.financial_movements for update
  to authenticated
  using ((select private.is_owner()))
  with check ((select private.is_owner()));
create policy "Owners can delete financial movements"
  on public.financial_movements for delete
  to authenticated
  using ((select private.is_owner()));

revoke all on public.financial_movements from anon;
grant select, insert, update, delete on public.financial_movements to authenticated;
