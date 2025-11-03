# Operations Tenant Isolation Notes

## Required Supabase policies

Enable row level security and create the policies documented in `supabase/migrations/20260302120000_enforce_hr_tenant_isolation.sql`:

- `public.profiles`: allow `select` and `update` when `auth.uid() = id` **and** `company_id::text = current_setting('request.jwt.claims.company_id', true)`.
- `public.departments`, `public.schedules`, `public.time_off_requests`, `public.goals`, `public.tasks`: enable RLS and allow `select/insert/update/delete` only when the row `company_id` matches the JWT company claim and the viewer belongs to the same company.
- `public.forms`: enable RLS; grant access when the viewer and the form owner share a company (checked via `profiles.company_id`).

## Seed data

After applying the migration, seed the workspace with `supabase/seeds/operations_tenant_seed.sql`. The seed creates:

- One company row.
- Two employee profiles (an owner/admin plus a regular employee).
- One department, one schedule entry, and one pending time-off request.
- One goal, two tasks (draft and active), and one published form metadata row.

The seed defines a test user (`ops_admin@example.com`). Export `E2E_EMAIL` and `E2E_PASSWORD` with that account’s credentials before running the Playwright smoke suite (`pnpm playwright test`).

## Developer diagnostics

The dashboard shows a dev-mode Supabase error panel when profile bootstrap fails. The panel is only rendered in development builds (`import.meta.env.DEV`), so simply running `pnpm dev` enables it.
