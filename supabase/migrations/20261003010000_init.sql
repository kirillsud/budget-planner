-- Budget Planner v4: initial schema
-- Incomes and expenses share one table and one shape: both have a period
-- [date_from, date_to]. A record is anchored to date_from in the forecast.
-- Money is stored in minor units (cents) as bigint.

create type public.record_type as enum ('income', 'expense');

create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  balance bigint not null default 0,
  balance_updated_at timestamptz not null default now(),
  daily_expenses bigint not null default 0 check (daily_expenses >= 0),
  warning_balance bigint not null default 0,
  critical_balance bigint not null default 0,
  scale_months int not null default 2 check (scale_months between 1 and 24),
  currency char(3) not null default 'EUR',
  locale text not null default 'ru' check (locale in ('ru', 'en')),
  updated_at timestamptz not null default now()
);

comment on table public.settings is 'One row per user: current balance, daily spending and forecast thresholds.';

create table public.budget_records (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.record_type not null,
  title text not null check (char_length(title) between 1 and 200),
  amount bigint not null check (amount >= 0),
  date_from date not null,
  date_to date not null,
  completed boolean not null default false,
  deleted_at timestamptz,
  legacy_id int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_records_period check (date_to >= date_from)
);

comment on table public.budget_records is 'Planned incomes and expenses. Soft-deleted via deleted_at.';

create index budget_records_user_dates
  on public.budget_records (user_id, date_from)
  where deleted_at is null;

create unique index budget_records_legacy
  on public.budget_records (user_id, type, legacy_id)
  where legacy_id is not null;

-- updated_at maintenance
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

create trigger budget_records_touch before update on public.budget_records
  for each row execute function public.touch_updated_at();

-- balance_updated_at follows changes of the balance itself
create or replace function public.touch_balance_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.balance is distinct from old.balance then
    new.balance_updated_at = now();
  end if;
  return new;
end;
$$;

create trigger settings_touch_balance before update on public.settings
  for each row execute function public.touch_balance_updated_at();

-- create a settings row for every new user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.settings (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row Level Security: every user sees and changes only their own rows
alter table public.settings enable row level security;
alter table public.budget_records enable row level security;

create policy "settings: select own" on public.settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "settings: insert own" on public.settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "settings: update own" on public.settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "records: select own" on public.budget_records
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "records: insert own" on public.budget_records
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "records: update own" on public.budget_records
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "records: delete own" on public.budget_records
  for delete to authenticated using ((select auth.uid()) = user_id);
