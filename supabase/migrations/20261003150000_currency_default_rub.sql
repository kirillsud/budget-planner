-- Default currency is the Russian rouble; the user can change it in settings.
alter table public.settings alter column currency set default 'RUB';

alter table public.settings
  add constraint settings_currency_iso check (currency ~ '^[A-Z]{3}$');

-- Accounts created before this migration got EUR only as the old default.
update public.settings set currency = 'RUB' where currency = 'EUR';
