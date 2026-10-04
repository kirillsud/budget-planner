# CLAUDE.md

Read the Miro spec board before changing behavior: https://miro.com/app/board/uXjVEfVXVh0=/
(docs 00-06, the Roadmap kanban, the data model and screen flow diagrams). If code and board disagree, the board wins;
if the board is silent, ask and record the question in doc 06.

## Rules

- Domain logic lives in `src/domain` as pure functions with unit tests. Add a test before changing the forecast.
- Money is integer cents (`bigint` in Postgres, `number` in TS). Never floats.
- Dates are ISO strings `YYYY-MM-DD`; use `src/domain/dates.ts`, never `Date` arithmetic with local time.
- Schema changes only through a new file in `supabase/migrations`, then regenerate `src/data/database.types.ts`.
- RLS stays enabled on every user table. Never use the service role key in the app.
- Table grants: `anon` gets none on `public`; `authenticated` only what the app needs (never TRUNCATE; `series_id` /
  `series_index` are written only by the security definer functions). Every `security definer` function that takes an
  id must check the owner of that row against `auth.uid()`. `supabase/tests/rls_series.sql` checks this; run it after
  changing policies, grants or those functions.
- UI strings go through `useI18n().t()`; add both `ru` and `en` messages in `src/i18n.ts`.
- Conventional Commits. Run `npm run ci` before pushing.

## Decisions made after the first spec (2026-10-03)

- Incomes and expenses have the same shape: a period `[date_from, date_to]`; single day = equal dates.
- A record is anchored to `max(date_from, today)` in the forecast.
- Overdue = not completed and `date_to < today` (for both types; replaces the old "income today is overdue" rule).
- Rows show the balance after the day ("остаток"); the hero card shows the lowest end-of-day balance until the
  next income and the headroom above the critical level. The legacy start-of-day totals stay in `forecast()`.
- Currency is per account (`settings.currency`, ISO 4217), RUB by default; changeable in settings.
- Demo account `demo@example.com` / `budget-demo` (public), reset nightly by `private.reset_demo()` via pg_cron.
  Seeded rows are keyed by `legacy_id`; never use `delete` there, reset soft-deletes and upserts.
- Monthly repeats: `budget_series` holds the rule, occurrences are normal `budget_records` rows (`series_id`,
  `series_index`) generated ~13 months ahead by `private.extend_series()` (pg_cron daily) and by
  `public.repeat_monthly()`. Edit later months with `public.update_series_from()`, stop with `public.stop_series_from()`.
- Bank balance: Enable Banking (AIS, read-only), "bring your own key" — each user registers their own Enable Banking
  app (restricted production) and enters app id + private key in Settings. Keys live in Vault, only the `bank` edge
  function (service role) reads them; never return them to the browser. `settings.balance_source` = `manual|bank`;
  refresh on app open (throttled 10 min) + pg_cron `bank-refresh` 4×/day (PSD2 limit). Hidden for the demo account.
- `/help/privacy` and `/help/terms` are static bilingual pages in `public/help` (needed by Enable Banking app
  registration), outside the SPA and the i18n dictionary; keep them in step with what the app stores.
- Forecast vs reality: `balance_snapshots` (written only by a trigger on `settings` when the balance is set, at most
  one row per UTC day: a later change the same day overwrites it) + `src/domain/reality.ts`. Real daily spending = (start balance + completed incomes −
  completed expenses − end balance) / days over the last ≤30 days (≥7 to show, ≥14 and no undecided past records to
  suggest a new daily figure). Records count by `date_from` in (start day, end day]. Hidden for the demo account.
- Not in v1 yet: automatic balance change on "paid", data migration from the old MySQL.
