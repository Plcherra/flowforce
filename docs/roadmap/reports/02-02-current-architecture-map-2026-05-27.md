# Phase 02.02 - Current Architecture Map

Date: 2026-05-27

## Summary

FlowForce is a large single Next.js application with a broad feature surface, an App Router shell, many feature-local hooks/repositories, a substantial Supabase schema/test layer, and CI gates that already protect migration, security, typecheck, build, onboarding, and visible-module smoke behavior.

The architecture should be normalized before it is extracted.

## Top-Level Runtime Map

- `package.json`: npm scripts, Next.js runtime, release/test commands, React 18, Next 16, Supabase JS, React Query, Radix, Playwright, TypeScript.
- `package-lock.json`: current install contract.
- `next.config.mjs`: Next config, app redirects, React Router adapter alias, package import optimization.
- `tsconfig.json`: `@/*` points to `src/*`; `react-router-dom` points to `src/lib/router-adapter`.
- `app/layout.tsx`: root layout and providers.
- `app/app/layout.tsx`: authenticated app layout wrapper.
- `supabase/config.toml`: linked managed Supabase project ref.
- `.github/workflows/release-gates.yml`: local Supabase, migration reset, security tests, typechecks, build, E2E, smoke.
- `.github/workflows/deploy-readiness.yml`: remote migration drift and contract readiness.

## App Routes

Scan result:

- 71 page files.
- 10 API route handlers.

Public/marketing/auth routes:

- `app/page.tsx`
- `app/auth/page.tsx`
- `app/register/page.tsx`
- `app/onboarding/page.tsx`
- `app/company-registration/page.tsx`
- `app/pricing/page.tsx`
- `app/features/page.tsx`
- `app/templates/page.tsx`
- `app/templates/[templateId]/page.tsx`
- `app/hr-development/page.tsx`

Authenticated app shell:

- `app/app/page.tsx`
- `app/app/layout.tsx`
- `app/app/AppLayoutClient.tsx`
- `src/app-shell/AppShell.tsx`
- `src/app-shell/navigation/*`
- `src/app-shell/guards/*`
- `src/app-shell/tenant/TenantSetupRequired.tsx`

Pilot-relevant app routes:

- `app/app/dashboard/page.tsx`
- `app/app/employees/page.tsx`
- `app/app/enhanced-scheduling/page.tsx`
- `app/app/tasks/page.tsx`
- `app/app/messages/page.tsx`
- `app/app/messages/[filter]/page.tsx`
- `app/app/company-updates/page.tsx`
- `app/app/forms/page.tsx`
- `app/app/inventory/page.tsx`
- `app/app/inventory/items/page.tsx`
- `app/app/inventory/counts/page.tsx`
- `app/app/inventory/counts/[countId]/page.tsx`
- `app/app/inventory/purchasing/page.tsx`
- `app/app/inventory/prep/page.tsx`
- `app/app/inventory/cookbook/page.tsx`
- `app/app/inventory/reports/page.tsx`
- `app/app/reports/page.tsx`
- `app/app/settings/page.tsx`

Legacy/alias app routes to clarify:

- `app/app/inventory-actions/page.tsx`
- `app/app/inventory-count-execution/[[...countId]]/page.tsx`
- `app/app/items-setup/page.tsx`
- `app/app/purchasing/page.tsx`
- `app/app/cookbook/page.tsx`
- `app/app/time-off/page.tsx`
- `app/app/availability/page.tsx`
- `app/app/availability/manage/page.tsx`
- `app/app/scheduling/timeoff/page.tsx`

Beta/internal or later-scope routes:

- `app/app/ai-insights/page.tsx`
- `app/app/analytics/page.tsx`
- `app/app/operations/page.tsx`
- `app/app/performance/page.tsx`
- `app/app/recognition/page.tsx`
- `app/app/leaderboard/page.tsx`
- `app/app/certifications/page.tsx`
- `app/app/learning-center/page.tsx`
- `app/app/goals/page.tsx`
- `app/app/meetings/page.tsx`
- `app/app/resources/page.tsx`
- `app/app/help-desk/page.tsx`
- `app/app/permission-demo/page.tsx`
- `app/app/add-section/page.tsx`
- `app/app/section/[path]/[[...wildcard]]/page.tsx`
- `app/app/sections-permissions/page.tsx`

API routes:

- `app/api/onboarding/complete/route.ts`
- `app/api/onboarding/repair/route.ts`
- `app/api/cron/auto-cleanup-drafts/route.ts`
- `app/api/cron/daily-digest/route.ts`
- `app/api/cron/employee-engagement-score/route.ts`
- `app/api/cron/schedule-auto-publish/route.ts`
- `app/api/logs/route.ts`
- `app/api/run-detectors/route.ts`
- `app/api/run-dev-detectors/route.ts`
- `app/api/ops/issues/[issueId]/suggest-automation/route.ts`

## Feature Modules

Scan result:

- 31 first-level feature folders under `src/features`.

Largest feature areas by file count:

- `src/features/scheduling`: 106 files.
- `src/features/inventory`: 104 files.
- `src/features/messages`: 61 files.
- `src/features/forms`: 58 files.
- `src/features/employees`: 48 files.
- `src/features/analytics`: 47 files.
- `src/features/company-updates`: 41 files.
- `src/features/tasks`: 38 files.
- `src/features/onboarding`: 35 files.
- `src/features/system`: 29 files.
- `src/features/learning`: 29 files.
- `src/features/goals`: 28 files.
- `src/features/admin`: 27 files.
- `src/features/operations`: 25 files.
- `src/features/gamification`: 24 files.

Pilot module candidates:

- `src/features/dashboard`
- `src/features/employees`
- `src/features/scheduling`
- `src/features/tasks`
- `src/features/messages`
- `src/features/company-updates`
- `src/features/forms`
- `src/features/inventory`
- `src/features/analytics`
- `src/features/system`
- `src/features/onboarding`
- `src/features/roles`

Later/beta module candidates:

- `src/features/ai`
- `src/features/operations`
- `src/features/goals`
- `src/features/learning`
- `src/features/gamification`
- `src/features/performance`
- `src/features/recognition`
- `src/features/resources`
- `src/features/helpdesk`
- `src/features/templates`
- `src/features/sections`

## Hooks, Services, And Repositories

Shared/global hook surface:

- 79 files under `src/hooks`.
- Important shared hooks include auth, company, tenant context, permissions, roles, navigation, Supabase query helpers, dashboard data, reports, inventory, tasks, messages, employees, realtime, and company updates.

Feature-local repositories:

- Calendar: `src/features/calendar/repositories/calendarEventsRepository.ts`
- Company updates: `src/features/company-updates/repositories/companyUpdatesRepository.ts`
- Employees: `src/features/employees/repositories/employeesRepository.ts`
- Forms: `src/features/forms/repositories/formsRepository.ts`
- Goals: `src/features/goals/repositories/*`
- Inventory: `src/features/inventory/repositories/*`
- Scheduling: `src/features/scheduling/repositories/*`
- Tasks: `src/features/tasks/repositories/*`

Root repositories:

- `src/repositories/companyRepository.ts`
- `src/repositories/certificationsRepository.ts`
- `src/repositories/performanceRepository.ts`
- `src/repositories/ticketsRepository.ts`

Server-side surface:

- `app/api/_server/*`
- `src/server/supabaseAdmin.ts`
- `src/server/automation/*`
- `src/server/copilot/*`
- `src/server/ingestion/processor.ts`
- `src/server/ops/suggestions/generateAutomationSuggestion.ts`
- `src/server/schedule/engine.ts`
- `src/server/vendorEvents.ts`

Shared library surface:

- `src/lib/config.ts`
- `src/lib/env.ts`
- `src/lib/queryKeys.ts`
- `src/lib/auth/acl.ts`
- `src/lib/permissions/*`
- `src/lib/api/scheduleGateway.ts`
- `src/lib/cron/verifyCron.ts`
- `src/lib/inventory/production.ts`
- `src/lib/router-adapter.tsx`
- `src/lib/storageObjects.ts`
- `src/lib/storagePaths.ts`
- `src/lib/signedStorageUrls.ts`

## Supabase Surface

Supabase files:

- `supabase/config.toml`
- `supabase/database.types.ts`
- `supabase/database-overrides.ts`
- `supabase/migrations/*`
- `supabase/functions/*`
- `supabase/tests/*`
- `supabase/seed.sql`
- `supabase/seeds/operations_tenant_seed.sql`

Migration domains:

- Onboarding/schema alignment.
- Security hardening.
- App contract RPCs/views.
- Storage contracts and privacy.
- Business table RLS.
- Messaging/forms/scheduling RLS.
- Analytics/operations/learning RLS.
- Onboarding idempotence and repair.
- System logs contract.
- Visible module smoke contracts.
- Scheduling domain replacement.
- People/messages domain replacement.
- Forms/documents domain replacement.
- Inventory/finance domain replacement.

Generated type surface includes tenant/core, messaging, forms, inventory, scheduling, tasks, analytics, operations, learning, payments, permissions, storage-adjacent documents/files, reports, and system settings tables.

Important generated RPCs/functions:

- `create_company_with_setup`
- `current_user_company_ids`
- `current_user_is_company_admin`
- `get_company_roles`
- `get_dashboard_stats`
- `get_kpi_summary`
- `get_security_contract_status`
- `log_audit_event`
- `trigger_onboarding_checklist`
- `assert_company_membership`

Edge functions:

- `ai-analyze-updates`
- `ai-insights`
- `ai-scheduling-assistant`
- `copilot-dispatcher`
- `copilot-evaluate-employee`
- `copilot-service`
- `delete-user-account`
- `learning-admin-enrollments`
- `learning-progress-history`
- `schedule-event`
- `vendor-sync`

## Tests And Release Gates

Supabase SQL tests:

- Tenant isolation and business table RLS.
- Messaging/forms/scheduling isolation.
- Analytics/operations/learning isolation.
- Storage path hardening and privacy.
- Restore/RLS containment.
- Custom section and visible module smoke contracts.
- Tasks/scheduling smoke contracts.
- Inventory smoke contracts.
- Core scheduling, people/messages, forms/documents, and inventory/finance domain contracts.

Playwright tests:

- Certifications.
- Events calendar.
- Goals dashboard.
- Learning tenant isolation.
- Operations smoke.
- Scheduling smoke.
- Settings.

Scripted checks:

- `scripts/check-supabase-contract.mjs`
- `scripts/check-supabase-migration-drift.mjs`
- `scripts/e2e-onboarding-complete.mjs`
- `scripts/smoke-visible-modules.mjs`
- `scripts/typecheck-scopes.mjs`
- `scripts/test-all-pages.mjs`
- `scripts/test-pages-simple.mjs`

CI:

- `.github/workflows/release-gates.yml`
- `.github/workflows/deploy-readiness.yml`

## Shared Code Candidates

Highest-priority shared boundaries:

- Tenant context and company membership.
- Auth and session state.
- Role and permission contracts.
- Module visibility and navigation rules.
- Query key naming.
- Supabase result/error handling.
- Audit event contracts.
- App shell loading/empty/error/beta states.
- Feature repository/service conventions.
- Generated database type import rules.

Candidate first modules for normalization:

- Inventory.
- Scheduling.
- Tasks.
- Employees.
- Messages.
- Forms.
- Company updates.
- Analytics/reports.

## Risky Legacy, Demo, Or Internal Areas

Treat these as reference-only or behind beta/internal gates until reviewed:

- `docs/archive/*`
- `docs/archive/capacitor.config.ts`
- `src/mock`
- `src/devtools`
- `src/services/performance/performanceMocks.ts`
- `src/features/inventory/services/financialDemoData.ts`
- `app/app/permission-demo/page.tsx`
- `app/app/add-section/page.tsx`
- `app/app/section/[path]/[[...wildcard]]/page.tsx`
- `app/api/run-dev-detectors/route.ts`
- `app/api/_server/ops/dev-detectors/*`
- Broad gamification, recognition, performance, learning, goals, help desk, resources, and custom-section expansion routes.

Route duplication/ownership risk:

- Inventory exists through both old flat routes and newer nested `/app/inventory/*` routes.
- Availability/time-off routes appear in multiple locations.
- Navigation still contains broad modules beyond the pilot sidebar defined in Phase 01.07.

## Deployment And Runtime Assumptions

- Node 22 in GitHub Actions.
- npm and `package-lock.json`.
- Next.js web/server runtime.
- Managed Supabase project for remote readiness.
- Local Supabase in release gates.
- Supabase CLI version pinned in workflows.
- Environment variables include public Supabase URL/anon key, service-role key, database password, cron secret, OpenAI/API feature flags, and logging flags.
- CI expects a local production server at `http://127.0.0.1:3000`.

## Architecture Implications

1. Do not start package extraction yet.
2. Normalize shared types before moving modules.
3. Normalize shared data access before adding more cross-module workflows.
4. Clarify route ownership and visible navigation before mobile shell work.
5. Keep archived/demo code out of pilot claims.
6. Keep Supabase tests and release gates as the non-negotiable safety net.

## Acceptance Result

- App routes mapped.
- Feature modules mapped.
- Hooks, services, repositories, and server helpers mapped.
- Supabase surface mapped.
- Tests and release gates mapped.
- Shared code candidates identified.
- Risky legacy/demo areas identified.
- Deployment/runtime assumptions identified.

## Next Phase

Continue to Phase 02.03: shared type boundary.
