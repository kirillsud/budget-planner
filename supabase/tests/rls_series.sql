-- Cross-tenant checks for budget_records / budget_series (security review SR-001, SR-007).
-- Plain SQL, everything runs in one transaction and is rolled back, so it is safe on any database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/rls_series.sql
-- or paste it into the Supabase SQL editor. It raises an exception on the first failed check.

begin;

create function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end $$;

create function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
end $$;

create function pg_temp.act_as_admin() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end $$;

-- runs a statement and requires it to fail with one of the given SQLSTATEs
create function pg_temp.expect_error(label text, stmt text, states text[]) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'FAIL: % was allowed', label;
exception when others then
  if sqlstate = any (states) then
    raise notice 'ok: % (%)', label, sqlstate;
  else
    raise;
  end if;
end $$;

create function pg_temp.expect_count(label text, stmt text, want bigint) returns void language plpgsql as $$
declare got bigint;
begin
  execute stmt into got;
  if got is distinct from want then
    raise exception 'FAIL: % (got %, want %)', label, got, want;
  end if;
  raise notice 'ok: %', label;
end $$;

-- fixtures: users a and b, b owns a series with one record
insert into auth.users (id, aud, role, email) values
  ('aaaaaaaa-0000-4000-8000-00000000000a', 'authenticated', 'authenticated', 'rls-a@example.invalid'),
  ('bbbbbbbb-0000-4000-8000-00000000000b', 'authenticated', 'authenticated', 'rls-b@example.invalid');

insert into public.budget_series (id, user_id, type, title, amount, first_date)
overriding system value
values (900001, 'bbbbbbbb-0000-4000-8000-00000000000b', 'expense', 'b rent', 1000, '2026-11-01');
insert into public.budget_records (id, user_id, type, title, amount, date_from, date_to, series_id, series_index)
overriding system value
values (900001, 'bbbbbbbb-0000-4000-8000-00000000000b', 'expense', 'b rent', 1000, '2026-11-01', '2026-11-01', 900001, 0),
       (900002, 'aaaaaaaa-0000-4000-8000-00000000000a', 'expense', 'a coffee', 5, '2026-11-02', '2026-11-02', null, null);

-- 1. user a cannot attach a record to b's series
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-00000000000a');
select pg_temp.expect_error('a inserts a record with b''s series_id',
  $$insert into public.budget_records (type, title, amount, date_from, date_to, series_id, series_index)
    values ('expense', 'x', 1, '2026-11-03', '2026-11-03', 900001, 5)$$, array['42501', '23503']);
select pg_temp.expect_error('a points its own record at b''s series',
  $$update public.budget_records set series_id = 900001, series_index = 7 where id = 900002$$, array['42501', '23503']);

-- 2. the composite FK holds even for a writer that bypasses column grants
select pg_temp.act_as_admin();
select pg_temp.expect_error('foreign key rejects a series of another user',
  $$insert into public.budget_records (user_id, type, title, amount, date_from, date_to, series_id, series_index)
    values ('aaaaaaaa-0000-4000-8000-00000000000a', 'expense', 'x', 1, '2026-11-03', '2026-11-03', 900001, 9)$$, array['23503']);

-- 3. user a sees and changes nothing of b
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-00000000000a');
select pg_temp.expect_count('a sees none of b''s records', 'select count(*) from public.budget_records where user_id <> auth.uid()', 0);
select pg_temp.expect_count('a sees none of b''s series', 'select count(*) from public.budget_series', 0);
select pg_temp.expect_error('a cannot call update_series_from on b''s record',
  $$select public.update_series_from(900001, 'expense', 'hacked', 1, '2026-11-01', '2026-11-01')$$, array['P0002']);
select pg_temp.expect_error('a cannot call stop_series_from on b''s record',
  $$select public.stop_series_from(900001)$$, array['P0002']);
select pg_temp.expect_error('a cannot call repeat_monthly on b''s record',
  $$select public.repeat_monthly(900001)$$, array['P0002']);
select pg_temp.expect_error('a cannot write budget_series directly',
  $$update public.budget_series set title = 'hacked'$$, array['42501']);
select pg_temp.expect_error('a cannot truncate budget_records', $$truncate public.budget_records$$, array['42501']);

-- 4. the legitimate flow still works for a
select pg_temp.act_as('aaaaaaaa-0000-4000-8000-00000000000a');
select pg_temp.expect_count('a can repeat its own record', 'select (public.repeat_monthly(900002) is not null)::int', 1);
select public.update_series_from(900002, 'expense', 'a tea', 7, '2026-11-02', '2026-11-02');
select pg_temp.expect_count('a can update its own series', $$select (count(*) >= 2)::int from public.budget_records where title = 'a tea' and series_id is not null$$, 1);
select public.stop_series_from(900002);

-- 5. b is untouched
select pg_temp.act_as_admin();
select pg_temp.expect_count('b''s series is unchanged', $$select count(*) from public.budget_series where id = 900001 and title = 'b rent' and ends_on is null$$, 1);
select pg_temp.expect_count('b''s record is unchanged', $$select count(*) from public.budget_records where id = 900001 and title = 'b rent' and deleted_at is null$$, 1);

-- 6. anon has no table access at all
select pg_temp.act_as_anon();
select pg_temp.expect_error('anon cannot read budget_records', 'select count(*) from public.budget_records', array['42501']);
select pg_temp.expect_error('anon cannot read settings', 'select count(*) from public.settings', array['42501']);
select pg_temp.expect_error('anon cannot truncate budget_records', 'truncate public.budget_records', array['42501']);

rollback;
