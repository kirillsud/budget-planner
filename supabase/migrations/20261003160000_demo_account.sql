-- Demo account for showing the app to friends.
-- Credentials are public on purpose (the login page has a "View demo" button):
--   email: demo@example.com   password: budget-demo
-- private.reset_demo() recreates the user if needed, restores its email and password,
-- and rewrites its settings and records with dates relative to today.
-- pg_cron runs it every night, so the demo always shows the next weeks and any edits
-- made by visitors disappear by the next morning.

create extension if not exists pg_cron;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.reset_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  demo_id constant uuid := 'd3e0d3e0-0000-4000-8000-00000000de30';
  demo_email constant text := 'demo@example.com';
  demo_password constant text := 'budget-demo';
  d date := current_date;
begin
  -- 1. The user: create it once, then keep email and password fixed.
  if not exists (select 1 from auth.users where id = demo_id) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', demo_id, 'authenticated', 'authenticated', demo_email,
      extensions.crypt(demo_password, extensions.gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"],"demo":true}'::jsonb, '{"name":"Demo"}'::jsonb, now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), demo_id, demo_id::text, 'email',
      jsonb_build_object('sub', demo_id::text, 'email', demo_email, 'email_verified', true),
      now(), now(), now()
    );
  else
    update auth.users
       set email = demo_email,
           encrypted_password = extensions.crypt(demo_password, extensions.gen_salt('bf')),
           email_change = '', email_change_token_new = '', email_change_token_current = '',
           banned_until = null, updated_at = now()
     where id = demo_id;
  end if;

  -- 2. Settings (the signup trigger creates the row; upsert keeps this idempotent).
  insert into public.settings (user_id, balance, daily_expenses, warning_balance, critical_balance, scale_months, currency, locale)
  values (demo_id, 12000000, 150000, 3500000, 1000000, 2, 'RUB', 'ru')
  on conflict (user_id) do update set
    balance = excluded.balance,
    daily_expenses = excluded.daily_expenses,
    warning_balance = excluded.warning_balance,
    critical_balance = excluded.critical_balance,
    scale_months = excluded.scale_months,
    currency = excluded.currency,
    locale = excluded.locale,
    balance_updated_at = now() - interval '2 days';

  -- 3. Records, amounts in kopecks, dates relative to today.
  -- Hide everything visitors added or changed; seeded rows come back below.
  update public.budget_records set deleted_at = now()
   where user_id = demo_id and deleted_at is null;

  -- Seeded rows are keyed by legacy_id (the demo user never has real legacy data).
  insert into public.budget_records (user_id, legacy_id, type, title, amount, date_from, date_to, completed) values
    -- past, waiting for a decision (shows the "past records" banner)
    (demo_id,  1, 'expense', 'Кофемашина',                 2400000, d - 6,  d - 2,  false),
    (demo_id,  2, 'income',  'Возврат НДФЛ',               1300000, d - 4,  d - 4,  false),
    -- this month
    (demo_id,  3, 'expense', 'Аренда квартиры',            5500000, d + 3,  d + 3,  false),
    (demo_id,  4, 'expense', 'Интернет и связь',            120000, d + 5,  d + 5,  false),
    (demo_id,  5, 'expense', 'Спортзал',                    450000, d + 8,  d + 8,  false),
    (demo_id,  6, 'expense', 'Подарок маме',                800000, d + 12, d + 18, false),
    (demo_id,  7, 'income',  'Зарплата',                  14000000, d + 14, d + 14, false),
    (demo_id,  8, 'expense', 'Коммунальные услуги',         650000, d + 20, d + 20, false),
    (demo_id,  9, 'expense', 'Страховка автомобиля',       1200000, d + 22, d + 28, false),
    -- next month
    (demo_id, 10, 'expense', 'Аренда квартиры',            5500000, d + 33, d + 33, false),
    (demo_id, 11, 'expense', 'Интернет и связь',            120000, d + 35, d + 35, false),
    (demo_id, 12, 'expense', 'Билеты в отпуск',            3800000, d + 36, d + 45, false),
    (demo_id, 13, 'expense', 'Спортзал',                    450000, d + 38, d + 38, false),
    (demo_id, 14, 'income',  'Зарплата',                  14000000, d + 44, d + 44, false),
    (demo_id, 15, 'income',  'Фриланс: лендинг',           4500000, d + 48, d + 55, false),
    (demo_id, 16, 'expense', 'Коммунальные услуги',         650000, d + 50, d + 50, false)
  on conflict (user_id, type, legacy_id) where legacy_id is not null do update set
    title = excluded.title,
    amount = excluded.amount,
    date_from = excluded.date_from,
    date_to = excluded.date_to,
    completed = false,
    deleted_at = null;
end;
$$;

revoke execute on function private.reset_demo() from public, anon, authenticated;

-- every night at 03:00 UTC
select cron.schedule('reset-demo-account', '0 3 * * *', $$select private.reset_demo()$$);

-- seed it right away
select private.reset_demo();
