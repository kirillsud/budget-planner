-- Balance history for "forecast vs reality": every time the balance is set (by hand or from the bank)
-- the value is kept, so the app can compare the real change of the balance with the recorded incomes
-- and expenses and estimate the real daily spending.
-- One row per change, plus at most one row a day when the balance stays the same.

create table public.balance_snapshots (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  balance bigint not null,
  source text not null check (source in ('manual', 'bank')),
  observed_at timestamptz not null default now()
);

comment on table public.balance_snapshots is 'Balances the user saw over time; written by a trigger on settings.';

create index balance_snapshots_user_time on public.balance_snapshots (user_id, observed_at);

alter table public.balance_snapshots enable row level security;
create policy "balance snapshots: select own" on public.balance_snapshots
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.balance_snapshots from anon, authenticated;
grant select on public.balance_snapshots to authenticated;

create or replace function private.record_balance_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last public.balance_snapshots;
begin
  select * into last from public.balance_snapshots
   where user_id = new.user_id
   order by observed_at desc
   limit 1;
  if last.id is null
     or last.balance <> new.balance
     or last.observed_at < now() - interval '20 hours' then
    insert into public.balance_snapshots (user_id, balance, source, observed_at)
    values (new.user_id, new.balance, new.balance_source, new.balance_updated_at);
  end if;
  return new;
end;
$$;

revoke execute on function private.record_balance_snapshot() from public, anon, authenticated;

-- fires when the balance is set: a manual change, or a bank refresh (which also bumps balance_updated_at)
create trigger settings_balance_snapshot after update on public.settings
  for each row
  when (old.balance is distinct from new.balance or old.balance_updated_at is distinct from new.balance_updated_at)
  execute function private.record_balance_snapshot();

-- start the history with the current balances (the demo account is reset nightly, its history is meaningless)
insert into public.balance_snapshots (user_id, balance, source, observed_at)
select s.user_id, s.balance, s.balance_source, s.balance_updated_at
  from public.settings s
 where s.user_id <> 'd3e0d3e0-0000-4000-8000-00000000de30';
