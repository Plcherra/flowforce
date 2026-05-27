# Security Review Pass

Date: 2026-05-27

## Scope

Phase 03.09 reviews the current SaaS security baseline for tenant isolation, service-role usage, storage privacy, route protection, anon exposure, and secret leakage.

## Findings And Fixes

### Tenant And Database Security

The active Supabase contract already checks:

- required tenant tables and RPCs.
- RLS coverage across public tenant tables.
- storage bucket privacy.
- storage policies.
- anon exposure checks.

The latest `npm run check:supabase` result showed:

- 119 RLS tables covered.
- 10 storage buckets checked.
- 6 storage policies checked.
- 0 public tables with RLS disabled.
- 0 anon exposures.
- 0 missing required relations or RPCs.

### Environment Hygiene

`.env` was tracked by git, which is not acceptable for a production SaaS repository. It is now removed from git tracking and ignored by `.gitignore`.

Allowed tracked env file:

- `.env.example`

Ignored secret files:

- `.env`
- `.env.*`
- `*.local`

### Server-Only Secrets

OpenAI and vendor API keys are now server-only environment values.

Removed browser-era secret paths:

- `NEXT_PUBLIC_OPENAI_API_KEY`
- `VITE_OPENAI_API_KEY`
- public vendor API key variables.
- browser-side `dangerouslyAllowBrowser` OpenAI usage.

Client engagement analytics now uses a deterministic local score instead of calling OpenAI from the browser. Server automation suggestions use `serverEnv.OPENAI_API_KEY`.

### Service Routes

Service routes now have explicit protection:

- Cron and detector routes use `CRON_SECRET`.
- Cron secret comparison uses `timingSafeEqual`.
- Internal support tooling uses `SUPPORT_ADMIN_TOKEN` and `x-support-token`.
- Employee invite uses bearer session verification and audit events.
- Onboarding repair uses bearer session verification.
- Automation suggestion route now requires bearer session verification and server-side tenant membership checks.

### Support Route Safety

The support route remains internal-only:

- unavailable when `SUPPORT_ADMIN_TOKEN` is not configured.
- protected with constant-time token comparison.
- writes `support_tool_runs`.
- writes audit events for diagnostics and repair.
- keeps impersonation blocked for v1.

## Remaining Risks

- `LOG_INGEST_TOKEN` is useful for log noise control, but browser-submitted logs should not be treated as a high-security boundary.
- Supabase Edge Functions still need a dedicated later review for provider-specific auth, CORS, tenant scope, and audit behavior before broad production enablement.
- A future support console UI should consume the internal support route instead of introducing new service-role paths.

## Verification

Run:

```bash
npm run check:security-review
npm run check:supabase
npm run test:db:security
```

`npm run check:security-review` confirms:

- `.env` is not tracked.
- `.gitignore` protects local env files.
- browser-side OpenAI/vendor key paths are absent.
- `dangerouslyAllowBrowser` is absent.
- cron and support token checks use constant-time comparison.
- automation suggestion route is authenticated and tenant-checked.
- anon exposure checks remain part of the Supabase contract.
