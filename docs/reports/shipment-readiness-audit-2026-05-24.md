# FlowForce Shipment Readiness Audit

Date: 2026-05-24

## Update 2026-05-24

Phase 1 through Phase 6 remediation have now been applied after this audit was written. The original finding that `check:supabase` could report false-positive RPC readiness has been addressed: the checker now performs real read RPC calls, safe mutating RPC existence probes, anon exposure checks, 61-table RLS checks, sensitive anon-grant checks, and storage contract checks.

Phase 3 added an idempotent `create_company_with_setup` RPC, local pgTAP coverage for core two-tenant isolation and setup retry behavior, and production guards that stop silently substituting placeholder profile/company data when tenant setup is incomplete.

Phase 4 added company-scoped RLS for the first high-risk business tables: tasks, goals, calendar events, event participants/shift links, company updates/comments/reactions, payments, expenses, inventory items, and inventory transactions. The local security suite now includes business-table tenant isolation checks.

Phase 5 added company-scoped ownership, triggers, RLS, and two-tenant tests for messaging, forms, schedules, assignments, templates, time off, and user unavailability.

Phase 6 added company-scoped RLS and tests for analytics, operations, documents, vendor visits, learning, recognition, gamification, and recognition/analytics views.

## Executive Verdict

FlowForce is not shipment-ready yet. The account-creation path is materially improved: signup now calls a server-side onboarding endpoint and can create the company/profile rows with the service role. The larger post-signup error pattern is coming from a database recovery migration that creates a broad schema surface without the production guarantees a multi-tenant SaaS needs.

The most important issue is not TypeScript or build stability. The app builds, typechecks, and the current Supabase smoke contract passes. The issue is that the restored schema is structurally unsafe: it creates 172 relations, but defines no RLS policies, no RLS enables, no foreign keys, and no functions. It also grants anon read access and authenticated write access across all public tables. A live anon-key permission probe confirmed unauthenticated reads currently succeed against sensitive tenant tables including `profiles` and `companies`.

## Checks Run

- `npm run check:supabase`: passed. It verifies required relations and five read RPCs exist on the configured Supabase project.
- `npm run typecheck`: passed. `typecheck:app`, `typecheck:tests`, and `typecheck:supabase` all passed.
- `npm run lint`: passed with 0 errors and 821 warnings.
- `npm run build`: passed with Next.js 16.2.6.
- Migration static audit:
  - `20260513000100_restore_feature_schema.sql`: 172 created relations.
  - RLS enables: 0.
  - Policies: 0.
  - Foreign key mentions: 0.
  - Functions: 0.
  - Empty tables: `company_members`, `supabase_migrations`.
- Live anon-key probe:
  - `profiles`: anon select succeeded, count 1.
  - `companies`: anon select succeeded, count 1.
  - `tasks`, `messages`, `company_updates`, `calendar_events`, `payments`, `expenses`, `inventory_transactions`, `audit_log`, `system_logs`, `company_invites`, `user_permissions`, `company_roles`: anon select succeeded.

## Critical Findings

### P0: Tenant data is exposed to anonymous reads

The restore migration grants `select` on all public tables to `anon` and default future tables:

- `supabase/migrations/20260513000100_restore_feature_schema.sql:1929`
- `supabase/migrations/20260513000100_restore_feature_schema.sql:1941`

Because most restored tables do not have RLS enabled, table grants are enough to expose data. The live anon-key probe confirmed that unauthenticated reads are accepted for tenant tables.

Required fix:

- Revoke broad anon grants immediately.
- Enable RLS on every tenant/business table.
- Add deny-by-default policies, then explicit company-scoped policies.
- Add a CI probe that fails if anon can read sensitive tables.

### P0: Authenticated users likely have cross-tenant write access

The restore migration grants `select, insert, update, delete` on all public tables to `authenticated` and to future tables:

- `supabase/migrations/20260513000100_restore_feature_schema.sql:1931`
- `supabase/migrations/20260513000100_restore_feature_schema.sql:1943`

Without RLS, any logged-in user can potentially write to other tenants' rows if they can guess IDs or issue direct Supabase requests.

Required fix:

- Revoke blanket authenticated DML.
- Replace with RLS policies using a single canonical membership predicate.
- Prefer `company_members` or `profiles.company_id`, but make the choice explicit and consistent.

### P0: Source-controlled migrations do not represent the live database contract

The app references 13 RPCs. None are defined in the source-controlled migrations:

- `assert_company_membership`
- `create_company_invite`
- `create_company_with_setup`
- `get_ai_kpi_insights`
- `get_company_roles`
- `get_dashboard_stats`
- `get_employee_enrichment`
- `get_kpi_summary`
- `get_recipient_insights`
- `log_audit_event`
- `replace_event_participants`
- `replace_event_shift_links`
- `trigger_onboarding_checklist`

`npm run check:supabase` passes because the remote database has at least some of these RPCs, not because the repo can recreate them. A fresh database from migrations will not match production behavior.

Required fix:

- Pull/dump the canonical remote schema into migrations.
- Define every RPC, trigger, view, policy, and grant in source control.
- Run `supabase db reset` locally as a release gate.

### P1: The restore migration creates placeholder relations, not a real data model

Examples:

- `company_members` is created with no primary key at `supabase/migrations/20260513000100_restore_feature_schema.sql:210`.
- `supabase_migrations` is created in `public` at line 1631, which should not be an app table.
- `v_training_completion_events` is created as a physical table at line 1811 despite the `v_` view naming.
- `calendar_events_full`, `calendar_unified_view`, `recognitions`, and `vendor_event` are empty `where false` views at lines 1900-1921.

This explains why pages can load with fewer "missing table" errors while still showing empty modules, broken joins, missing write paths, and inconsistent runtime behavior.

Required fix:

- Replace placeholder views with real view definitions.
- Add real primary keys, unique constraints, foreign keys, checks, and indexes.
- Delete accidental/public migration bookkeeping tables.

### P1: Account creation is fixed tactically, but not fully routed through the transactional path

The new onboarding endpoint verifies the auth user and creates/updates company and profile rows with the service role:

- `app/api/onboarding/complete/route.ts:126`
- `app/api/onboarding/complete/route.ts:206`
- `app/api/onboarding/complete/route.ts:229`

Remaining risks:

- The route is not wrapped in a database transaction. A company insert can succeed and profile upsert can fail, leaving partial onboarding.
- Existing company update uses a fresh slug each retry, so repeated onboarding can mutate the company slug and metadata.
- The route trusts a client-provided `userId` after checking the email. This is much better than no check, but the stronger pattern is to require an authenticated session or signed one-time onboarding token.

Required fix:

- Route onboarding completion through the idempotent `create_company_with_setup` RPC added in Phase 3, or remove the duplicated route-side write path.
- Add an onboarding E2E that proves exactly one company/profile/membership/settings baseline after signup and retry.
- Persist and reuse slug after first company creation for any remaining route-side update path.

### P1: Fallbacks were masking broken tenant linkage

`ProfileContext` returns a placeholder profile when the real profile is missing:

- `src/contexts/ProfileContext.tsx:249`

`useCompany` falls back to a demo company on missing or failed company linkage:

- `src/hooks/useCompany.tsx:179`
- `src/hooks/useCompany.tsx:221`

This is useful for dev resilience, but dangerous for shipment because it can hide failed onboarding, RLS errors, or missing migrations behind apparently working UI.

Required fix:

- In production, block app access if profile/company linkage is missing. Phase 3 implemented this guard.
- Replace the null/error state with a setup-repair screen or support-safe error.
- Emit structured errors for missing profile, missing company, policy denial, and schema mismatch.

### P1: System settings and storage surfaces are not restored

Code references relations/storage buckets missing from migrations, including:

- `system_settings`
- `audit_logs` versus existing `audit_log`
- `company-assets`
- `form-audio`
- `form-images`
- `form-signatures`
- `form-uploads`
- `form-videos`
- `message-attachments`

`useSystemSettings` reads and inserts into `system_settings`, but that table is not defined in the restore migration:

- `src/features/system/hooks/useSystemSettings.ts:145`
- `src/features/system/hooks/useSystemSettings.ts:154`

Required fix:

- Add migrations for `system_settings`.
- Standardize `audit_log` versus `audit_logs`.
- Source-control Supabase storage bucket creation and policies.

### P2: Quality gates are too shallow

Current `check:supabase` verifies existence, not safety or behavior:

- It checks relations with `select("*").limit(0)`.
- It skips mutating RPC checks.
- It does not test anon denial, tenant isolation, RLS policies, constraints, or storage access.

Required fix:

- Add schema reconstruction test: `supabase db reset`.
- Add anon-denial tests for every sensitive table.
- Add two-tenant isolation tests for read and write paths.
- Add onboarding E2E that verifies exactly one auth user, company, profile, and settings row.
- Add API/RPC contract tests for all mutating RPCs.

## Shipment Plan

### Phase 1: Stop the bleeding

- Revoke broad anon/authenticated grants.
- Enable RLS on all tenant tables.
- Add minimal company-scoped select/insert/update/delete policies for core tables.
- Add an anon permission probe to CI.
- Disable or gate modules whose tables are placeholders.

### Phase 2: Make migrations canonical

- Dump the current remote schema, including functions, policies, triggers, grants, views, and storage policies.
- Split the restore migration into domain migrations: core auth/tenant, people, scheduling/calendar, messages, forms, inventory/finance, learning/recognition, analytics/operations.
- Add foreign keys and checks domain by domain.
- Ensure `supabase db reset` produces a working local app.

### Phase 3: Harden onboarding

- Convert onboarding completion to a transactional DB function. Implemented for `create_company_with_setup`; remaining work is routing the production endpoint through it.
- Make retries idempotent. Implemented in Phase 3 and covered by pgTAP.
- Create required post-onboarding rows: settings, default roles, initial company membership, audit event. Implemented in Phase 3 and covered by pgTAP.
- Replace placeholder profile/company fallbacks in production. Implemented in Phase 3; remaining work is a polished repair/setup screen.

### Phase 4: Prove SaaS readiness

- Add two-tenant Playwright/API tests. SQL-level two-tenant coverage now exists for core onboarding and the first high-risk business tables.
- Add storage bucket policy tests.
- Add module smoke tests against a seeded tenant.
- Require clean build, typecheck, lint budget, Supabase contract, RLS audit, and E2E onboarding before release.

## Current Release Gate

Do not ship until these are true:

- Anon cannot read `profiles`, `companies`, or any tenant table.
- A logged-in user cannot read/write another tenant's rows.
- A fresh database from source migrations has all required tables, views, RPCs, policies, storage buckets, and seeds.
- New account creation creates the full tenant baseline without console floods.
- Production mode does not silently fall back to demo company/profile data.
