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
- Not in v1 yet: automatic balance change on "paid", data migration from the old MySQL.
