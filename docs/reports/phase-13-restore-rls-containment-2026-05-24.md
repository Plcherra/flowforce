# Phase 13 Restore RLS Containment Report

Date: 2026-05-24

## Scope

Phase 13 contains the legacy restore migration surface without rewriting the already-applied restore file. The goal was to remove the critical Supabase advisory where 112 restored public tables still had row level security disabled.

## Changes

- Added `supabase/migrations/20260524001600_phase13_restore_rls_containment.sql`.
- Enabled RLS on every remaining public table created by the restore migration.
- Revoked anonymous access from restored tables.
- Added conservative authenticated policies for restored tables that expose tenant or user ownership columns.
- Kept internal/cache-style restored tables service-role only.
- Made restored global/reference tables authenticated read-only.
- Extended `public.get_security_contract_status` with `disabledPublicTables`.
- Updated `scripts/check-supabase-contract.mjs` to fail when any public table has RLS disabled.
- Added `supabase/tests/phase13_restore_rls_containment.test.sql`.
- Added Phase 13 to `npm run test:db:security`.

## Validation

- `env -u DOCKER_HOST npx supabase db reset`
- `env -u DOCKER_HOST npm run test:db:security`
- Local `npm run check:supabase` with local Supabase service-role/anon keys
- `npm run typecheck`
- `env -u DOCKER_HOST npx supabase db push --yes`
- `env -u DOCKER_HOST npx supabase db push --dry-run`
- `env -u DOCKER_HOST npm run check:supabase`

## Result

- Remote database is up to date.
- Contract check reports `OK no public tables with RLS disabled`.
- Security suite now covers Phase 3 through Phase 7 and Phase 10 through Phase 13.

## Remaining Risk

This is a containment migration, not the final domain split. The generic restored-table policies are intentionally conservative and should be replaced by reviewed domain migrations for people/HR, scheduling, messaging, forms, inventory, finance, learning, analytics, and operations.
