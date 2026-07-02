# Environment Configuration

Last updated: 2026-05-27

This is the canonical environment contract for FlowForce. Keep real values in `.env.local`, Supabase secrets, GitHub repository secrets, or VPS secret storage. Never commit real keys.

## Public Browser Variables

These variables are safe to expose to the browser and use the `NEXT_PUBLIC_` prefix.

Required for production:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optional:

```bash
NEXT_PUBLIC_LOG_LEVEL=info
NEXT_PUBLIC_REMOTE_LOG_LEVEL=warn
NEXT_PUBLIC_ENABLE_REMOTE_LOGS=true
NEXT_PUBLIC_REMOTE_LOG_ENDPOINT=/api/logs
NEXT_PUBLIC_ENABLE_AI_INSIGHTS=false
NEXT_PUBLIC_DEFAULT_COMPANY_ID=
NEXT_PUBLIC_FLOWFORCE_AUTOMATIONS_ENDPOINT=
```

## Server-Only Variables

These values must never be exposed through `NEXT_PUBLIC_*`.

Required for production API routes, backend scripts, and Supabase Edge Functions:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional by feature:

```bash
OPENAI_API_KEY=
CRON_SECRET=
LOG_INGEST_TOKEN=
LOG_LEVEL=info
LOG_PERSIST_LEVEL=warn
LOG_PERSISTENCE=true
SUPPORT_ADMIN_TOKEN=
```

## Test And Smoke Variables

Local and CI checks use these names:

```bash
TEST_URL=http://127.0.0.1:3000
ONBOARDING_E2E_BASE_URL=http://127.0.0.1:3000
SMOKE_TIMEOUT_MS=30000
SMOKE_HEADED=0
SMOKE_KEEP_DATA=0
KPI_RANGE_DAYS=14
```

## Deploy And Supabase Variables

GitHub Actions deploy-readiness expects these repository secrets or workflow env values:

```bash
SUPABASE_DB_PASSWORD=
SUPABASE_PROJECT_REF=vncapxfubgqaibhjwtoy
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Optional deploy tooling:

```bash
SUPABASE_ACCESS_TOKEN=
SUPABASE_CLI_BIN=supabase
SUPABASE_CLI_VERSION=2.101.0
```

## Runtime Rules

- Browser code should import public Supabase config through `src/lib/config.ts`.
- Server code should read server-only values directly or through `src/lib/env.ts`.
- Production builds assert required public config at startup.
- Service-role access still fails lazily and clearly when admin operations are used without `SUPABASE_SERVICE_ROLE_KEY`.
- Internal support tooling is disabled unless `SUPPORT_ADMIN_TOKEN` is set; never expose it as a public variable.
- Legacy `VITE_*` fallbacks remain only for migration compatibility. New variables should use the normalized names in this document.

## Local Setup

Use `.env.local` for local development:

```bash
cp .env.example .env.local
npm run dev
```

If Docker or Colima is running, local Supabase checks can use:

```bash
supabase start
supabase db reset
npm run check:supabase
```

Without Docker, link to the remote project and avoid local reset commands:

```bash
npm run supabase:doctor
npm run supabase:link
npm run db:push
npm run check:supabase
```

Windows setup guide: [`docs/supabase-cli-setup-windows.md`](./supabase-cli-setup-windows.md)

Use npm scripts instead of bare `supabase db push` so `.env.local` credentials load automatically.

## CI And VPS Setup

- Release Gates starts local Supabase, exports local Supabase env values, runs schema/security checks, typechecks, builds, and runs smoke tests.
- Deploy Readiness uses remote Supabase secrets for migration drift and schema/security checks.
- VPS deployment should set the same public and server-only variables as production GitHub secrets. Do not rely on `.env.example` values outside local development.
