# Phase 14 - Authenticated Module Smoke Contracts

Date: 2026-05-24

## Goal

Turn the visible-module smoke test into a real authenticated SaaS readiness gate, then repair the database and frontend contracts it exposed.

## Completed

- Replaced shallow route checks with an authenticated Playwright smoke script that seeds a temporary tenant, signs in through `/auth`, visits 11 app modules, records page/runtime/fetch failures, and cleans up seeded data.
- Added `/api/logs` ingestion so client logging no longer produces route-level 404s during app use.
- Restored PostgREST relationship contracts for custom sections, employees, company updates, messages, forms, tasks, scheduling, calendar, and inventory production flows.
- Added `get_employee_enrichment` RPC with tenant membership enforcement.
- Fixed the employees invite dialog infinite render loop.
- Fixed raw calendar REST calls to send the current Supabase session token instead of anonymous-only headers.
- Added `NEXT_PUBLIC_ENABLE_AI_INSIGHTS` feature flag, default off, so dashboards do not call optional AI Edge Functions unless explicitly enabled.
- Redacted diagnostic URLs/tokens in the smoke JSON report so browser warnings cannot persist Supabase keys or JWTs.

## Migrations Added

- `20260524001700_phase14_custom_sections_smoke_contract.sql`
- `20260524001800_phase14_employee_module_smoke_contract.sql`
- `20260524001900_phase14_visible_module_contracts.sql`
- `20260524002000_phase14_tasks_scheduling_smoke_contracts.sql`
- `20260524002100_phase14_inventory_smoke_contracts.sql`

All five Phase 14 migrations are applied remotely.

## Test Coverage Added

- `supabase/tests/phase14_custom_sections_smoke_contract.test.sql`
- `supabase/tests/phase14_visible_module_contracts.test.sql`
- `supabase/tests/phase14_tasks_scheduling_smoke_contracts.test.sql`
- `supabase/tests/phase14_inventory_smoke_contracts.test.sql`

## Verification

- `env -u DOCKER_HOST npx supabase db reset` passed.
- Phase 14 pgTAP tests passed: 8 + 24 + 10 + 18 tests.
- `npm run check:supabase` passed with 0 missing relations, 0 relation errors, 0 missing RPCs, 0 anon exposures, and 0 security contract errors.
- `npm run typecheck:src` passed.
- `npm run test:smoke` passed: 11/11 authenticated visible modules.
- Post-push `supabase migration list` shows local and remote matched through `20260524002100`.
- Post-push `npm run check:supabase` passed against the linked environment with 0 missing relations, 0 relation errors, 0 missing RPCs, 0 anon exposures, and 0 security contract errors.
- Post-push `npm run test:smoke` passed 11/11 against the remote schema through the local Next app.
- Smoke cleanup verified: 0 `module-smoke-%` companies remain.

## Remaining Risk

- Company updates repeatedly refetch during smoke and take around 31 seconds to settle. It passes, but this should be optimized before release.
- AI insights now require an explicit public feature flag and deployed Edge Function readiness before being considered part of the release gate.
