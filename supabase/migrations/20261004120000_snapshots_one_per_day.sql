-- Security review SR-009: balance_snapshots grew by one row per balance change, so a single account
-- (including the shared demo) could fill the table. Now there is at most one row per UTC day and user:
-- a later change on the same day overwrites that row, a new day adds one (even if the balance is unchanged).
-- src/domain/reality.ts already uses the last snapshot of a date, so the estimate is unaffected.

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
     or (last.observed_at at time zone 'utc')::date <> (new.balance_updated_at at time zone 'utc')::date then
    insert into public.balance_snapshots (user_id, balance, source, observed_at)
    values (new.user_id, new.balance, new.balance_source, new.balance_updated_at);
  elsif last.balance <> new.balance then
    update public.balance_snapshots
       set balance = new.balance, source = new.balance_source, observed_at = new.balance_updated_at
     where id = last.id;
  end if;
  return new;
end;
$$;

revoke execute on function private.record_balance_snapshot() from public, anon, authenticated;
