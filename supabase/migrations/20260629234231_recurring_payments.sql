-- Koi Office — recurring (monthly) payments
-- A monthly movement keeps the next month's occurrence created as 'pending'. Generation
-- is idempotent per series+month and rolls forward when an occurrence is created or settled.
-- Cascade is prevented via pg_trigger_depth(): generated inserts run at depth > 1 and do not
-- re-trigger generation.

create type public.financial_recurrence as enum ('none', 'monthly');

alter table public.financial_movements
  add column recurrence public.financial_recurrence not null default 'none',
  add column series_id uuid;

create index financial_movements_series_id_idx
  on public.financial_movements(series_id)
  where series_id is not null;

-- A monthly movement that has no series yet becomes the head of its own series.
create function private.assign_movement_series()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.recurrence = 'monthly' and new.series_id is null then
    new.series_id := new.id;
  end if;
  return new;
end;
$$;

revoke all on function private.assign_movement_series() from public, anon, authenticated;

create trigger financial_movements_assign_series
  before insert on public.financial_movements
  for each row execute function private.assign_movement_series();

-- Creates the next month's occurrence for a series, unless one already exists for that month.
-- security definer so the system-generated row is not blocked by the owner-only RLS insert
-- check; the original creator is preserved.
create function private.create_next_movement(source public.financial_movements)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  base_date date;
  next_date date;
begin
  if source.series_id is null then
    return;
  end if;

  base_date := coalesce(source.due_date, source.occurred_on);
  next_date := (base_date + interval '1 month')::date;

  if exists (
    select 1
    from public.financial_movements m
    where m.series_id = source.series_id
      and date_trunc('month', coalesce(m.due_date, m.occurred_on)::timestamp)
          = date_trunc('month', next_date::timestamp)
  ) then
    return;
  end if;

  insert into public.financial_movements (
    type, status, concept, category, amount, currency,
    occurred_on, due_date, settled_on,
    client_id, project_id, notes, recurrence, series_id, created_by
  ) values (
    source.type, 'pending', source.concept, source.category, source.amount, source.currency,
    next_date, next_date, null,
    source.client_id, source.project_id, source.notes, 'monthly', source.series_id, source.created_by
  );
end;
$$;

revoke all on function private.create_next_movement(public.financial_movements) from public, anon, authenticated;

-- On manual creation of a monthly movement, seed the next occurrence (one ahead).
-- security definer so the nested call to create_next_movement runs as the owner.
create function private.generate_recurring_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.recurrence = 'monthly' and pg_trigger_depth() = 1 then
    perform private.create_next_movement(new);
  end if;
  return null;
end;
$$;

revoke all on function private.generate_recurring_on_insert() from public, anon, authenticated;

create trigger financial_movements_generate_on_insert
  after insert on public.financial_movements
  for each row execute function private.generate_recurring_on_insert();

-- When a monthly occurrence is settled, ensure the following month exists (rolls forward).
-- security definer so the nested call to create_next_movement runs as the owner.
create function private.generate_recurring_on_settle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.recurrence = 'monthly'
     and new.status = 'settled'
     and old.status is distinct from 'settled' then
    perform private.create_next_movement(new);
  end if;
  return null;
end;
$$;

revoke all on function private.generate_recurring_on_settle() from public, anon, authenticated;

create trigger financial_movements_generate_on_settle
  after update of status on public.financial_movements
  for each row execute function private.generate_recurring_on_settle();
