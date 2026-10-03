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
