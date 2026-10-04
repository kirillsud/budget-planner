# Budget Planner v4

Personal budget planner with a day-by-day balance forecast: planned incomes and expenses, daily spending,
warning and critical thresholds, the lowest balance until the next income and what is still safe to spend.

Spec (source of truth): Miro board https://miro.com/app/board/uXjVEfVXVh0=/

## Stack

- Vite + React 19 + TypeScript (strict), TanStack Router, TanStack Query, Tailwind CSS v4, PWA
- Supabase: Postgres, Auth (magic link, optional Google), Row Level Security; no custom backend
- Vitest for the domain logic, deployed on Vercel

## Getting started

```shell
cp .env.example .env.local   # fill in the publishable key
npm install
npm run dev
```

Scripts: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`, `npm run ci` (all checks).

## Structure

- `src/domain` - pure TypeScript: dates, money, records, forecast. No React, no Supabase. Fully unit-tested.
- `src/data` - Supabase client, generated types, TanStack Query hooks.
- `src/features` - screens: auth, home (forecast and timeline), records (add/edit sheet), overdue, settings.
- `supabase/migrations` - SQL migrations. Apply with `supabase db push` or the Supabase MCP.

## Supabase

Project `budget-planner` (ref `klswsqobopbttgwdnqce`, eu-central-1). Tables `settings` and `budget_records`,
RLS on both: a user only sees their own rows. A trigger creates the settings row on sign-up.

After a schema change: add a migration, apply it, regenerate `src/data/database.types.ts`.

## Legacy code

- `legacy/v3-nx` - the unfinished Nx + React + Express rewrite (2022) that used to live in the repository root.
- v1 (PHP + jQuery Mobile, the version that ran in production) and v2 (AngularJS + PHP REST, unfinished) live in
  private Bitbucket repositories and are not part of this repo.

## Demo account

The login page has an "Open the demo" button that signs in as `demo@example.com` / `budget-demo` (public on purpose).
`private.reset_demo()` restores its settings, password and 16 sample records with dates relative to today; pg_cron runs it
every night at 03:00 UTC (job `reset-demo-account`). Run `select private.reset_demo();` in the SQL editor to reset now.

## Bank balance (Enable Banking)

Optional, per user, read-only. Every user brings their own free Enable Banking application:

1. Sign up at https://enablebanking.com, Control Panel → Applications → new application, environment **Production**
   (restricted mode: only your own accounts), redirect URL `https://<app host>/bank/callback`.
2. Generate the key in the browser, download the `.pem`, link your own account in the panel as Enable Banking asks.
3. In the planner: Settings → "Balance from your bank" → paste the application ID and the `.pem`, then pick the bank.

Server side: `supabase/functions/bank` (deploy with `supabase functions deploy bank --project-ref klswsqobopbttgwdnqce`;
`verify_jwt = false` comes from `supabase/config.toml`; it checks the user JWT itself and the cron
secret for `cron-refresh`), tables `bank_credentials` / `bank_connections`, private key in Supabase Vault.
