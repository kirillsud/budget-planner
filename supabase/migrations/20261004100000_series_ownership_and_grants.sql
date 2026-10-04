-- Security review SR-001 and SR-007.
--
-- SR-001: a signed-in user could point their own record at someone else's series_id and then call
-- update_series_from / stop_series_from to change or stop that series. Three layers close it:
--   1. a composite FK, so a record can only reference a series of the same user;
--   2. series_id / series_index are no longer writable by the app roles (only the security definer
--      functions and pg_cron set them);
--   3. both RPCs check the owner of the series itself, not only of the record.
--
-- SR-007: anon had full table privileges on public tables; RLS was the only barrier. Now only
-- authenticated has grants, and new tables no longer get anon grants by default.

-- 1. composite FK ---------------------------------------------------------------------------------

alter table public.budget_series
  add constraint budget_series_id_user_key unique (id, user_id);

alter table public.budget_records
  drop constraint budget_records_series_id_fkey,
  add constraint budget_records_series_owner_fkey
    foreign key (series_id, user_id) references public.budget_series (id, user_id)
    on delete set null (series_id);

-- 2. column privileges ----------------------------------------------------------------------------

revoke insert, update on public.budget_records from authenticated;
grant insert (user_id, type, title, amount, date_from, date_to, completed)
  on public.budget_records to authenticated;
grant update (type, title, amount, date_from, date_to, completed, deleted_at)
  on public.budget_records to authenticated;

-- 3. owner checks in the RPCs ---------------------------------------------------------------------

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
   where id = r.series_id and user_id = auth.uid()
  returning * into s;
  if not found then
    raise exception 'record not found' using errcode = 'P0002';
  end if;

  update public.budget_records b
     set type = s.type, title = s.title, amount = s.amount,
         date_from = (s.first_date + make_interval(months => b.series_index))::date,
         date_to = (s.first_date + make_interval(months => b.series_index))::date + s.period_days
   where b.series_id = s.id
     and b.user_id = auth.uid()
     and b.series_index >= r.series_index
     and b.deleted_at is null
     and (b.completed = false or b.id = r.id);
end;
$$;

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

  update public.budget_series set ends_on = r.date_from - 1
   where id = r.series_id and user_id = auth.uid();
  if not found then
    raise exception 'record not found' using errcode = 'P0002';
  end if;

  update public.budget_records
     set deleted_at = now()
   where series_id = r.series_id
     and user_id = auth.uid()
     and series_index >= r.series_index
     and deleted_at is null
     and completed = false;
end;
$$;

-- repeat_monthly already checks the owner of the record and creates the series for that same user.

-- SR-007 ------------------------------------------------------------------------------------------

-- authenticated also does not need TRUNCATE (it ignores RLS), TRIGGER or REFERENCES, and series are
-- written only by the security definer functions.
revoke truncate, trigger, references on all tables in schema public from authenticated;
revoke insert, update, delete on public.budget_series from authenticated;

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
