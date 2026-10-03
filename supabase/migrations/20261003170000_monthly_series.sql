-- Monthly repeating records.
-- A series is the rule (title, amount, type, first date, period length). Its occurrences are
-- ordinary budget_records rows with series_id + series_index, generated about a year ahead,
-- so every month can still be completed, moved or deleted on its own.
-- Occurrence k starts at first_date + k months (Postgres clamps the day: Jan 31 + 1 month = Feb 28).

create table public.budget_series (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type public.record_type not null,
  title text not null check (char_length(title) between 1 and 200),
  amount bigint not null check (amount >= 0),
  first_date date not null,
  period_days int not null default 0 check (period_days between 0 and 27),
  ends_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.budget_series is 'Monthly repeat rules; occurrences live in budget_records.';

create trigger budget_series_touch before update on public.budget_series
  for each row execute function public.touch_updated_at();

alter table public.budget_series enable row level security;

create policy "series: select own" on public.budget_series
  for select to authenticated using ((select auth.uid()) = user_id);

alter table public.budget_records
  add column series_id bigint references public.budget_series (id) on delete set null,
  add column series_index int check (series_index >= 0),
  add constraint budget_records_series_pair check ((series_id is null) = (series_index is null));

create unique index budget_records_series_occurrence
  on public.budget_records (series_id, series_index)
  where series_id is not null;

-- Generates missing occurrences up to 13 months ahead. Existing rows (including soft-deleted
-- ones) are never recreated, so deleting a single month sticks.
create or replace function private.extend_series(p_series_id bigint default null)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.budget_records (user_id, type, title, amount, date_from, date_to, series_id, series_index)
  select s.user_id, s.type, s.title, s.amount,
         (s.first_date + make_interval(months => k))::date,
         (s.first_date + make_interval(months => k))::date + s.period_days,
         s.id, k
    from public.budget_series s
   cross join generate_series(0, 600) as k
   where (p_series_id is null or s.id = p_series_id)
     and (s.first_date + make_interval(months => k))::date <= current_date + interval '13 months'
     and (s.ends_on is null or (s.first_date + make_interval(months => k))::date <= s.ends_on)
  on conflict (series_id, series_index) where series_id is not null do nothing;
$$;

revoke execute on function private.extend_series(bigint) from public, anon, authenticated;

-- Turns an existing record into the first month of a new series.
create or replace function public.repeat_monthly(p_record_id bigint)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.budget_records;
  new_series_id bigint;
begin
  select * into r from public.budget_records
   where id = p_record_id and user_id = auth.uid() and deleted_at is null;
  if not found then
    raise exception 'record not found' using errcode = 'P0002';
  end if;
  if r.series_id is not null then
    return r.series_id;
  end if;
  if r.date_to - r.date_from > 27 then
    raise exception 'a repeating record can last at most 28 days' using errcode = '22023';
  end if;

  insert into public.budget_series (user_id, type, title, amount, first_date, period_days)
  values (r.user_id, r.type, r.title, r.amount, r.date_from, r.date_to - r.date_from)
  returning id into new_series_id;

  update public.budget_records set series_id = new_series_id, series_index = 0 where id = r.id;
  perform private.extend_series(new_series_id);
  return new_series_id;
end;
$$;

-- Applies new values to this record and every later month of its series that is not completed yet.
create or replace function public.update_series_from(
  p_record_id bigint,
  p_type public.record_type,
  p_title text,
  p_amount bigint,
  p_date_from date,
  p_date_to date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.budget_records;
  s public.budget_series;
  new_first date;
begin
  select * into r from public.budget_records
   where id = p_record_id and user_id = auth.uid() and series_id is not null;
  if not found then
    raise exception 'record not found' using errcode = 'P0002';
  end if;
  if p_date_to < p_date_from or p_date_to - p_date_from > 27 then
    raise exception 'invalid period' using errcode = '22023';
  end if;

  new_first := (p_date_from - make_interval(months => r.series_index))::date;

  update public.budget_series
     set type = p_type, title = p_title, amount = p_amount,
         first_date = new_first, period_days = p_date_to - p_date_from
   where id = r.series_id
  returning * into s;

  update public.budget_records b
     set type = s.type, title = s.title, amount = s.amount,
         date_from = (s.first_date + make_interval(months => b.series_index))::date,
         date_to = (s.first_date + make_interval(months => b.series_index))::date + s.period_days
   where b.series_id = s.id
     and b.series_index >= r.series_index
     and b.deleted_at is null
     and (b.completed = false or b.id = r.id);
end;
$$;

-- Ends the series before this month: this and later months that are not completed are removed.
create or replace function public.stop_series_from(p_record_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.budget_records;
begin
  select * into r from public.budget_records
   where id = p_record_id and user_id = auth.uid() and series_id is not null;
  if not found then
    raise exception 'record not found' using errcode = 'P0002';
  end if;

  update public.budget_series set ends_on = r.date_from - 1 where id = r.series_id;

  update public.budget_records
     set deleted_at = now()
   where series_id = r.series_id
     and series_index >= r.series_index
     and deleted_at is null
     and completed = false;
end;
$$;

revoke execute on function public.repeat_monthly(bigint) from public, anon;
revoke execute on function public.update_series_from(bigint, public.record_type, text, bigint, date, date) from public, anon;
revoke execute on function public.stop_series_from(bigint) from public, anon;
grant execute on function public.repeat_monthly(bigint) to authenticated;
grant execute on function public.update_series_from(bigint, public.record_type, text, bigint, date, date) to authenticated;
grant execute on function public.stop_series_from(bigint) to authenticated;

-- keep every series filled about a year ahead
select cron.schedule('extend-monthly-series', '15 3 * * *', $$select private.extend_series()$$);
