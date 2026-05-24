# Supabase Environment Audit

Last updated: 2026-05-13

## Current Connection

- Local Supabase is not running on this machine because Docker is unavailable.
- This project is currently configured to use the remote Supabase project:
  - Project ref: `vncapxfubgqaibhjwtoy`
  - Project name: `FlowForce`
- `.env` contains `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`.
- `supabase/config.toml` now uses the same project ref as the linked project.

## Required Environment Variables

Required for the app:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional but used by parts of the app:

```bash
SUPABASE_URL=
OPENAI_API_KEY=
CRON_SECRET=
CONNECTEAM_API_KEY=
NEXT_PUBLIC_CONNECTEAM_API_BASE=
NEXT_PUBLIC_LOG_LEVEL=
NEXT_PUBLIC_REMOTE_LOG_LEVEL=
NEXT_PUBLIC_ENABLE_REMOTE_LOGS=
NEXT_PUBLIC_REMOTE_LOG_ENDPOINT=
LOG_INGEST_TOKEN=
LOG_LEVEL=
LOG_PERSIST_LEVEL=
LOG_PERSISTENCE=
NEXT_PUBLIC_DEFAULT_COMPANY_ID=
NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT=
TEST_URL=
SMOKE_TIMEOUT_MS=
KPI_RANGE_DAYS=
```

`.env.example` has been expanded to document these variables.

## Runtime Client Behavior

- Browser/client Supabase access uses `src/integrations/supabase/client.ts`.
- Server admin access uses the lazy proxy in `app/api/_server/supabaseAdmin.ts`.
- `src/services/supabase/admin.ts` now re-exports the same lazy admin client instead of constructing a service-role client at module import time.
- Missing server service-role config now fails only when admin access is actually used, with a clear error.

## Migration State

Remote migration status:

```text
Local          | Remote
20260509000100 | 20260509000100
20260513000100 | 20260513000100
```

The migration set now includes:

- `companies`
- `profiles`
- restored feature tables and compatibility views required by the current app surface

`20260513000100_restore_feature_schema.sql` is intentionally non-destructive. It restores the feature-schema surface expected by FlowForce without dropping existing onboarding data.

Current Supabase contract status:

```bash
npm run check:supabase
```

Result: 0 missing relations, 0 relation errors, 5/5 read RPC checks passing.

## Database Types State

`supabase/database.types.ts` now matches the linked remote schema after restoring the feature migration surface.

Observed check:

```bash
npx supabase gen types typescript --linked > /tmp/flowforce-linked.types.ts
diff -q supabase/database.types.ts /tmp/flowforce-linked.types.ts
```

Result:

- Generated linked remote file: 6522 lines
- Committed file updated from the linked remote schema
- `npm run typecheck` passes with 0 TypeScript errors

If the remote schema changes again, regenerate this file from the linked project instead of editing it manually.

## Seed State

`supabase/seed.sql` now creates a minimal usable core demo tenant:

- Company: `FlowForce Demo Company`
- Email: `demo.owner@flowforce.local`
- Password: `FlowForceDemo123!`

This seed is still intentionally core-focused. The feature schema now exists again, but feature demo data should be added deliberately per module instead of restoring old bulk seed data blindly.

## Fresh Setup Commands

Current safe setup for the remote-linked project:

```bash
supabase link --project-ref vncapxfubgqaibhjwtoy
supabase migration list
supabase db push
npm run check:supabase
```

For local reset, Docker must be running first:

```bash
supabase start
supabase db reset
```

Without Docker, use the linked remote project and `supabase db push`; do not run local reset commands.
