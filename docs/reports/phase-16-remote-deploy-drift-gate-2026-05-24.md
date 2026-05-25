# Phase 16 - Remote Deploy Drift Gate

Date: 2026-05-24

## Goal

Prevent production deploys when the linked Supabase project is not in the same migration/security state as source control.

## Completed

- Added `scripts/check-supabase-migration-drift.mjs`.
- Added `npm run check:supabase:remote-drift`.
- Added `npm run check:deploy`, which runs the remote migration drift check and the Supabase schema/security contract check.
- Added `.github/workflows/deploy-readiness.yml`.
- The deploy-readiness workflow is pinned to Node.js `22` and Supabase CLI `2.101.0`.
- The workflow uses the committed Supabase project ref plus `SUPABASE_DB_PASSWORD`, verifies migration history, runs `supabase db push --dry-run`, and checks the remote schema/security contract.

## Required GitHub Secrets

- `SUPABASE_DB_PASSWORD`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Gate Behavior

The drift check fails if:

- a source-controlled migration is missing remotely;
- a remote migration is missing locally;
- the Supabase CLI migration table shows mismatched local/remote rows;
- `supabase db push --dry-run` does not report the remote database as up to date.

## Verification

- `node --check scripts/check-supabase-migration-drift.mjs` passed.
- Workflow YAML parses for both release and deploy-readiness workflows.
- `env -u DOCKER_HOST npm run check:supabase:remote-drift` passed: 23 local migrations and 23 remote migrations matched.
- `env -u DOCKER_HOST npm run check:deploy` passed: remote migration drift check plus Supabase contract/security check.

## Remaining Risk

- The deploy-readiness workflow still needs its first hosted GitHub Actions run with real repository secrets.
- The gate verifies migration history and schema/security contracts, but it does not apply migrations. Migration application remains an intentional manual or protected release action.
- The large restore migration is still present and should be replaced by reviewed domain migrations in the next cleanup phase.
