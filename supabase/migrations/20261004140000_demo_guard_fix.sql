-- Fix for 20261004110000_demo_hardening.sql: the trigger on auth.users runs as supabase_auth_admin,
-- which had no EXECUTE on private.protect_demo_user() and no access to the `extensions` schema
-- (crypt), so every sign-in failed with "Database error granting user".
-- Now the function is SECURITY DEFINER, the caller is detected with session_user (the Auth server
-- connects as supabase_auth_admin; pg_cron and the SQL editor connect as postgres) and the Auth
-- role gets an explicit EXECUTE.

create or replace function private.protect_demo_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.id = 'd3e0d3e0-0000-4000-8000-00000000de30'::uuid and session_user = 'supabase_auth_admin' then
    if new.email is distinct from old.email
       or coalesce(new.email_change, '') <> ''
       or (new.encrypted_password is distinct from old.encrypted_password
           and new.encrypted_password is distinct from extensions.crypt('budget-demo', new.encrypted_password)) then
      raise exception 'demo_readonly: the demo account cannot change its email or password'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.protect_demo_user() from public, anon, authenticated;
grant execute on function private.protect_demo_user() to supabase_auth_admin;
