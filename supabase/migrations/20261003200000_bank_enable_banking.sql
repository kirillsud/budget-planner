-- Bank balance via Enable Banking, "bring your own key":
-- every user registers their own free Enable Banking application (restricted production, own accounts)
-- and stores its application id + private key here. The key lives encrypted in Supabase Vault and is
-- only ever read by the `bank` edge function (service role); the browser never gets it back.
-- Only account information (AIS, read-only) is used: no payments.

create extension if not exists pg_net;

-- balance source: entered by hand or synced from the bank
alter table public.settings
  add column balance_source text not null default 'manual' check (balance_source in ('manual', 'bank'));

create table public.bank_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null default 'enable_banking' check (provider = 'enable_banking'),
  app_id text,
  key_secret_id uuid,
  updated_at timestamptz not null default now()
);

comment on table public.bank_credentials is 'Per-user Enable Banking application id; the private key is in vault (key_secret_id).';

alter table public.bank_credentials enable row level security;
-- users may see whether they have credentials (app id only; the key itself is in vault)
create policy "bank credentials: select own" on public.bank_credentials
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.bank_credentials from anon, authenticated;
grant select on public.bank_credentials to authenticated;

create table public.bank_connections (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'choose_account', 'active', 'expired', 'revoked', 'error')),
  auth_state uuid unique,
  aspsp_name text not null,
  aspsp_country char(2) not null,
  required_psu_headers text[] not null default '{}',
  session_id text,
  accounts jsonb not null default '[]'::jsonb,
  account_uid text,
  account_name text,
  account_iban_tail text,
  currency char(3),
  valid_until timestamptz,
  last_balance bigint,
  last_balance_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index bank_connections_user on public.bank_connections (user_id, status);

create trigger bank_connections_touch before update on public.bank_connections
  for each row execute function public.touch_updated_at();

alter table public.bank_connections enable row level security;
create policy "bank connections: select own" on public.bank_connections
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.bank_connections from anon, authenticated;
grant select on public.bank_connections to authenticated;

-- Vault access for the edge function only (service_role).
create or replace function public.bank_set_credentials(p_user uuid, p_app_id text, p_private_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing uuid;
begin
  select key_secret_id into existing from public.bank_credentials where user_id = p_user;
  if existing is null then
    existing := vault.create_secret(p_private_key, 'bank_key_' || p_user::text, 'Enable Banking private key');
  else
    perform vault.update_secret(existing, p_private_key);
  end if;
  insert into public.bank_credentials (user_id, app_id, key_secret_id, updated_at)
  values (p_user, p_app_id, existing, now())
  on conflict (user_id) do update set app_id = excluded.app_id, key_secret_id = excluded.key_secret_id, updated_at = now();
end;
$$;

create or replace function public.bank_get_credentials(p_user uuid)
returns table (app_id text, private_key text)
language sql
security definer
set search_path = ''
as $$
  select c.app_id, s.decrypted_secret
    from public.bank_credentials c
    join vault.decrypted_secrets s on s.id = c.key_secret_id
   where c.user_id = p_user and c.app_id is not null;
$$;

-- "Remove keys": the vault secret is overwritten with an empty value and the app id cleared.
create or replace function public.bank_clear_credentials(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing uuid;
begin
  select key_secret_id into existing from public.bank_credentials where user_id = p_user;
  if existing is not null then
    perform vault.update_secret(existing, '');
  end if;
  update public.bank_credentials set app_id = null, updated_at = now() where user_id = p_user;
end;
$$;

-- shared secret the cron job sends to the edge function
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'bank_cron_secret', 'Auth for the bank refresh cron');

create or replace function public.bank_cron_secret()
returns text
language sql
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'bank_cron_secret' limit 1;
$$;

revoke execute on function public.bank_set_credentials(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.bank_get_credentials(uuid) from public, anon, authenticated;
revoke execute on function public.bank_clear_credentials(uuid) from public, anon, authenticated;
revoke execute on function public.bank_cron_secret() from public, anon, authenticated;
grant execute on function public.bank_set_credentials(uuid, text, text) to service_role;
grant execute on function public.bank_get_credentials(uuid) to service_role;
grant execute on function public.bank_clear_credentials(uuid) to service_role;
grant execute on function public.bank_cron_secret() to service_role;

-- Background refresh 4 times a day: PSD2 lets a provider read an account about 4 times a day
-- without the user present. On top of that the app refreshes when the user opens it.
select cron.schedule(
  'bank-refresh',
  '5 0,6,12,18 * * *',
  $$
  select net.http_post(
    url := 'https://klswsqobopbttgwdnqce.supabase.co/functions/v1/bank',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'bank_cron_secret' limit 1)
    ),
    body := '{"action":"cron-refresh"}'::jsonb
  );
  $$
);
