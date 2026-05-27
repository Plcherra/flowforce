# FlowForce Shipment Remediation Plan

Date: 2026-05-24

Purpose: convert the hard audit into an actionable fix plan for getting FlowForce to a secure, production-ready SaaS release.

## Progress Snapshot

As of 2026-05-24:

- Phase 1 security hardening is implemented in `supabase/migrations/20260524000100_phase1_security_hardening.sql` and applied remotely.
- Phase 2 app-contract repair is implemented in `supabase/migrations/20260524000200_phase2_app_contract_rpcs_and_views.sql` and applied remotely.
- Phase 2 storage contract is implemented in `supabase/migrations/20260524000300_phase2_storage_contract.sql` and applied remotely.
- Phase 3 onboarding idempotence is implemented in `supabase/migrations/20260524000400_phase3_onboarding_idempotence.sql` and applied remotely.
- Phase 4 business-table RLS is implemented in `supabase/migrations/20260524000500_phase4_business_table_rls.sql` and applied remotely.
- Phase 5 messaging/forms/scheduling RLS is implemented in `supabase/migrations/20260524000600_phase5_messaging_forms_scheduling_rls.sql` and applied remotely.
- Phase 6 analytics/operations/learning RLS is implemented in `supabase/migrations/20260524000700_phase6_analytics_ops_learning_rls.sql` and applied remotely.
- Phase 7 storage path hardening is implemented in `supabase/migrations/20260524000800_phase7_storage_path_hardening.sql` and `supabase/migrations/20260524000900_phase7_company_updates_media_bucket_mime.sql`, both applied remotely.
- Phase 8 onboarding endpoint hardening is implemented in `supabase/migrations/20260524001000_phase8_onboarding_rpc_payload_repair.sql`, `supabase/migrations/20260524001100_phase8_onboarding_identifier_type_alignment.sql`, and `supabase/migrations/20260524001200_phase8_system_logs_contract.sql`, all applied remotely.
- Phase 9 missing-tenant repair UX is implemented in `src/app-shell/tenant/TenantSetupRequired.tsx` and `app/api/onboarding/repair/route.ts`.
- Phase 10 sensitive storage privacy is implemented in `supabase/migrations/20260524001300_phase10_sensitive_storage_privacy.sql`, `src/lib/signedStorageUrls.ts`, message attachments, and report downloads; the migration is applied remotely.
- Phase 11 form storage privacy is implemented in `supabase/migrations/20260524001400_phase11_form_storage_privacy.sql`, form upload fields, `src/lib/storageObjects.ts`, and `supabase/tests/phase11_form_storage_privacy.test.sql`; the migration is applied remotely.
- Phase 12 remaining storage privacy is implemented in `supabase/migrations/20260524001500_phase12_remaining_storage_privacy.sql`, company update media previews, employee-report attachments, and `supabase/tests/phase12_remaining_storage_privacy.test.sql`; the migration is applied remotely.
- Phase 13 restore RLS containment is implemented in `supabase/migrations/20260524001600_phase13_restore_rls_containment.sql` and `supabase/tests/phase13_restore_rls_containment.test.sql`; the migration is applied remotely.
- Phase 14 authenticated module smoke contracts are implemented in `supabase/migrations/20260524001700_phase14_custom_sections_smoke_contract.sql` through `supabase/migrations/20260524002100_phase14_inventory_smoke_contracts.sql`; all Phase 14 migrations are applied remotely.
- Phase 15 release gates are implemented in `.github/workflows/release-gates.yml`; the workflow blocks PR/main changes on local migration rebuild, Supabase contract checks, pgTAP security suites, TypeScript, production build, onboarding E2E, and authenticated production smoke.
- Phase 16 remote deploy drift gate is implemented in `scripts/check-supabase-migration-drift.mjs`, `npm run check:deploy`, and `.github/workflows/deploy-readiness.yml`; it blocks deploy readiness when remote migration history or remote Supabase security contracts drift from source control.
- Phase 17 restore-migration domain inventory is implemented in `scripts/audit-restore-migration-domains.mjs`, `npm run audit:restore-domains`, and `docs/reports/phase-17-restore-domain-inventory-2026-05-24.md`; it classifies all 172 restore tables and 4 placeholder views across shipment domains before forward replacement migrations are written.
- Phase 18 core/scheduling domain replacement is implemented in `supabase/migrations/20260525000100_phase18_core_scheduling_domain_replacement.sql` and `supabase/tests/phase18_core_scheduling_domain_contracts.test.sql`; it adds reviewed core tenant constraints, an `audit_logs` compatibility view, explicit calendar/vendor RLS, and real `calendar_events_full`, `calendar_unified_view`, and `vendor_event` views.
- Phase 19 people/messages domain replacement is implemented in `supabase/migrations/20260525000200_phase19_people_messages_domain_replacement.sql` and `supabase/tests/phase19_people_messages_domain_contracts.test.sql`; it adds reviewed people/HR and messages/announcements company ownership, inheritance triggers, foreign-key contracts, explicit tenant RLS policies, and two-tenant pgTAP coverage.
- Phase 20 forms/documents domain replacement is implemented in `supabase/migrations/20260526000100_phase20_forms_documents_domain_replacement.sql` and `supabase/tests/phase20_forms_documents_domain_contracts.test.sql`; it adds reviewed form helper, custom section, custom report, document/file, helpdesk, and report event ownership, inheritance triggers, foreign-key contracts, explicit tenant RLS policies, and two-tenant pgTAP coverage.
- Phase 21 inventory/finance domain replacement is implemented in `supabase/migrations/20260526000200_phase21_inventory_finance_domain_replacement.sql` and `supabase/tests/phase21_inventory_finance_domain_contracts.test.sql`; it adds reviewed finance/procurement and inventory ownership, inherited company triggers, relationship guards, foreign-key contracts, explicit tenant RLS policies, and two-tenant pgTAP coverage.
- Production profile/company demo fallbacks are disabled in `src/contexts/ProfileContext.tsx` and `src/hooks/useCompany.tsx`; development fallbacks remain available.
- `npm run test:db:security` now runs Phase 3 through Phase 7, Phase 10 through Phase 14, and Phase 18 through Phase 21 pgTAP isolation/privacy/smoke/domain-contract suites.
- `npm run test:e2e:onboarding` verifies the real onboarding API endpoint creates the tenant baseline, retries idempotently, and cleans up the generated test tenant.
- Docker/Colima is now available for local Supabase validation.
- `supabase db reset` passes locally with `env -u DOCKER_HOST`.
- `npm run check:supabase` now verifies real read RPC calls, mutating RPC presence, 89 anon-denial checks, 119 RLS tables, no public tables with RLS disabled, sensitive anon grants, 10 storage buckets, and storage policies.
- Supabase TypeScript types were regenerated from the linked remote schema.

## Success Criteria

FlowForce is shipment-ready only when:

- Anonymous users cannot read tenant/business data.
- Authenticated users cannot read or mutate another tenant's data.
- A fresh database can be rebuilt from source-controlled migrations.
- Account creation creates the full tenant baseline without partial rows.
- The app no longer masks broken tenant linkage with demo profile/company fallbacks in production.
- Core modules pass smoke, contract, and two-tenant isolation tests.

## Ordered Fix Plan

### 1. Freeze the current restore migration as unsafe

Mark `supabase/migrations/20260513000100_restore_feature_schema.sql` as a stabilization artifact, not a production migration.

Acceptance:

- The team agrees this file cannot be shipped as-is.
- No release branch promotes broad grants or placeholder schema objects.

### 2. Revoke broad anonymous access

Remove these grants from the restore migration and apply equivalent revokes to the remote database:

- `grant select on all tables in schema public to anon`
- `alter default privileges in schema public grant select on tables to anon`

Acceptance:

- An anon-key probe against `profiles`, `companies`, `tasks`, `messages`, `payments`, `company_invites`, `user_permissions`, and `system_logs` fails with permission/RLS denial.

### 3. Revoke blanket authenticated DML

Remove broad authenticated table grants:

- `grant select, insert, update, delete on all tables in schema public to authenticated`
- `alter default privileges in schema public grant select, insert, update, delete on tables to authenticated`

Acceptance:

- Authenticated access is controlled by explicit RLS policies, not broad grants.

### 4. Define the canonical tenant membership model

Choose one canonical membership source:

- Option A: `profiles.company_id` for simple single-company membership.
- Option B: `company_members` for future multi-company membership.

Recommendation: use `company_members` long term, but keep `profiles.company_id` as the onboarding/current-company shortcut.

Acceptance:

- A written rule exists for how every table resolves `company_id`.
- Policies and application code use the same rule.

### 5. Repair core tenant tables first

Create a core migration for:

- `companies`
- `profiles`
- `company_members`
- `company_roles`
- `positions`
- `system_settings`
- `audit_log` or `audit_logs`, with one canonical name

Acceptance:

- Every table has primary keys, required `company_id` indexes where applicable, foreign keys, timestamps, and RLS enabled.
- `company_members` is no longer an empty table without a primary key.

### 6. Add core RLS policies

Create policies for core tenant reads and writes:

- Users can read their own profile.
- Users can read their active company.
- Company admins can manage company settings.
- Company admins can invite/manage members.
- Service role keeps administrative access.

Acceptance:

- Two test users in different companies cannot see each other's profiles, company rows, roles, settings, or invites.

### 7. Make onboarding transactional

Move onboarding completion into a transactional database function or a server route that calls a transactional RPC.

The transaction must create or verify:

- company
- owner profile
- company membership
- default roles
- default positions if selected
- system settings
- audit event

Acceptance:

- A forced failure halfway through onboarding rolls back all tenant rows.
- Retrying onboarding for the same user is idempotent.

Phase 3 status: implemented for `create_company_with_setup`. The RPC now reuses an existing `profiles.company_id`/`company_members.company_id`, repairs owner membership/profile/settings/default roles, and blocks authenticated users from creating setup for a different owner id.

Phase 8 status: the production onboarding completion API now routes through `create_company_with_setup` instead of duplicating company/profile/member/settings writes. The RPC now repairs company/profile payload details on retry. The onboarding E2E creates a fresh auth user, calls `/api/onboarding/complete`, verifies company/profile/company_members/system_settings/company_roles, retries the same endpoint, verifies the same company id is reused, then cleans up.

### 8. Stabilize slug and metadata handling

Stop regenerating company slug on each onboarding retry/update.

Acceptance:

- First company creation sets slug.
- Later onboarding retries reuse the existing slug.
- Auth metadata matches the actual company row.

### 9. Source-control all required RPCs

Add migrations for every app-referenced RPC:

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

Acceptance:

- A fresh `supabase db reset` has every RPC.
- Mutating RPCs have permission checks and tests.

### 10. Replace placeholder views with real views

Replace empty `where false` views with real definitions:

- `calendar_events_full`
- `calendar_unified_view`
- `recognitions`
- `vendor_event`

Acceptance:

- Calendar, recognition, and vendor modules return real seeded data.
- Views respect tenant scoping.

### 11. Split the giant restore migration by domain

Replace the single 1,946-line restore migration with domain migrations:

- core tenant/auth
- people/HR
- scheduling/calendar
- messages/announcements
- forms/sections
- inventory/finance
- learning/recognition
- analytics/operations
- system/admin/audit

Acceptance:

- Migrations are reviewable by domain.
- Each domain migration includes tables, constraints, indexes, RLS, policies, views, RPCs, and seed expectations.

Phase 13 status: a forward containment migration now enables RLS on the 112 restored public tables that were still RLS-disabled, revokes anonymous access, grants conservative authenticated tenant/user-scoped access where ownership columns exist, and blocks internal restored cache/system tables from client roles. This removes the immediate critical advisory, but the domain split remains the next cleanup step.

### 12. Add missing storage buckets and policies

Source-control setup for:

- `company-assets`
- `form-audio`
- `form-images`
- `form-signatures`
- `form-uploads`
- `form-videos`
- `message-attachments`
- `operations-reports`
- `attachments`

Phase 2 status: implemented. The current app retrieves public URLs for these files, so buckets are public by design for now. Company assets are company-prefixed, message attachments are user-prefixed, and form/report buckets remain authenticated-write public-read until their path conventions include company context.

Phase 7 status: company-prefixed storage paths are implemented for forms, messages, operations reports, employee report inbox attachments, and company update media. Storage write/update/delete policies now require the first path segment to be a company UUID in the authenticated user's membership set.

Phase 10 status: `message-attachments` and `operations-reports` are now private buckets. Message attachment previews and report original downloads use short-lived signed URLs.

Phase 11 status: form uploads now save durable storage path objects and the five form buckets are private.

Phase 12 status: company update media and employee-report attachments now use signed URL access, and their buckets are private. Only `company-assets` remains public by product intent for branding/logo assets.

Acceptance:

- Buckets exist after reset.
- Users can access only files for their company.
- Public buckets are explicitly documented and intentional.

### 13. Remove production demo fallbacks

Keep dev fallbacks if useful, but block production when required tenant context is missing.

Areas to change:

- `src/contexts/ProfileContext.tsx`
- `src/hooks/useCompany.tsx`

Acceptance:

- Missing profile/company shows a repair/setup-required screen.
- Production never silently uses `DEMO_COMPANY` for an authenticated tenant user.

Phase 3 status: production fallbacks are now disabled.

Phase 9 status: missing profile/company context now stops at the app-shell boundary with a setup-required screen instead of rendering tenant modules into null state. The screen can retry profile loading, repair from signup metadata through `/api/onboarding/repair`, send the user to setup, or sign out.

### 14. Strengthen Supabase contract checks

Upgrade `scripts/check-supabase-contract.mjs` from existence checks to readiness checks.

Add checks for:

- anon denial on sensitive tables
- RLS enabled on tenant tables
- required policies exist
- required foreign keys exist
- required RPCs exist
- mutating RPC dry-run or transaction-safe tests
- required storage buckets exist

Acceptance:

- The check fails against the current unsafe restore state.
- The check passes only when the database is genuinely release-safe.

### 15. Add two-tenant isolation tests

Create tests with two companies and two users.

Coverage:

- profile reads
- company reads
- settings reads/writes
- invites
- calendar events
- tasks
- messages
- forms
- inventory/finance records

Acceptance:

- User A cannot read or write Company B data through direct Supabase calls.

Phase 3 status: core tenant isolation coverage is implemented for companies, profiles, memberships, roles, positions, settings, invites, membership assertion, non-admin company updates, and idempotent setup retry. Remaining work: expand the same pattern to tasks, messages, calendar, scheduling, forms, inventory/finance, and analytics tables.

Phase 4 status: business isolation coverage is implemented for tasks, calendar events, event participants, event shift links, company updates/comments/reactions, payments, expenses, inventory items, and inventory transactions. Remaining work: messaging, forms, scheduling, storage paths, and analytics/domain-specific tables.

Phase 5 status: messaging, forms, schedules, schedule assignments, templates, time off, and user unavailability now have company-scoped RLS and two-tenant tests. Remaining work: analytics/operations tables, storage path hardening, onboarding E2E, and domain migration cleanup.

Phase 6 status: analytics, operations, documents, vendor visits, learning, recognition, gamification, goal rewards, and recognition views now have company-scoped RLS/two-tenant tests.

Phase 7 status: storage object writes are now company-scoped with pgTAP coverage for own-company uploads, cross-company rejection, and rejection of legacy global/user-prefixed upload paths.

Phase 10 status: path-aware sensitive buckets now have private-bucket coverage in `supabase/tests/phase10_sensitive_storage_privacy.test.sql`.

Phase 14 status: authenticated visible-module smoke is implemented, applied remotely, and passing 11/11 modules after the remote push. The smoke gate now seeds a tenant, signs in through `/auth`, visits dashboard, employees, tasks, messages, company updates, calendar, scheduling, forms, inventory, analytics, and settings, redacts tokens from stored diagnostics, and fails on page errors, schema/RLS fetch errors, and application error shells. The phase restored missing PostgREST relationships/RPCs across custom sections, employees, company updates, messaging, forms, tasks, scheduling, calendar auth headers, and inventory production contracts.

Phase 15 status: release gates are implemented in GitHub Actions and locally validated end to end against local Supabase plus the production Next server. The gate caught and fixed a production-only inventory route regression where legacy `/inventory/...` links caused 404 RSC prefetches from `/app/inventory-actions`; the app now has real `/app/inventory/...` route wrappers and corrected inventory navigation.

Phase 16 status: remote deploy readiness is implemented and locally validated against the linked Supabase project. `npm run check:supabase:remote-drift` compares source-controlled migration files with remote migration history and requires `supabase db push --dry-run` to report the remote as up to date. `npm run check:deploy` combines that drift check with the remote Supabase schema/security contract check.

### 16. Add onboarding E2E verification

Automate the account creation path.

Verify exactly one row each for:

- `auth.users`
- `companies`
- `profiles`
- `company_members`
- `system_settings`

Acceptance:

- New account reaches dashboard with a real profile and company.
- No missing-profile, missing-company, RLS, or migration errors appear in console logs.

### 17. Add module smoke tests against seeded data

Use a seeded tenant to smoke-test visible modules:

- dashboard
- employees
- tasks
- messages
- company updates
- calendar
- scheduling
- inventory
- analytics
- settings

Acceptance:

- Pages load authenticated.
- No application error shells.
- No schema/RLS console floods.

### 18. Establish release gates

Release requires:

- `npm run build`
- `npm run typecheck`
- lint under an agreed warning budget
- upgraded Supabase contract check
- local `supabase db reset`
- onboarding E2E
- two-tenant isolation suite
- module smoke suite

Acceptance:

- CI blocks release if any gate fails.

## Immediate Priority Order

1. Continue replacing the giant restore migration with reviewed domain migrations, moving next into learning/recognition/gamification, then analytics/operations.
2. Clean up the remaining restore-era broad grants from source history once all domain migrations own explicit grants/policies.
3. Clean up or migrate historical free-text public storage URLs from pre-privacy rows.
4. Decide the release cadence for pinned CI tools, starting with Supabase CLI `2.101.0`.

## First PR Recommendation

The first stabilization PR is effectively complete across Phases 1-13: broad grants were revoked, core and business RLS/policies were added, app-required RPCs/views/storage were source-controlled, local reset was restored, production demo fallbacks were disabled, storage writes were company-prefixed, all active sensitive buckets are private, the production onboarding endpoint now uses the idempotent setup RPC, missing tenant context has a repair screen, restored public tables now have RLS enabled, and two-tenant/onboarding/business/storage/API isolation tests were added.

The hosted CI/deploy path is now hardened and passing remotely. The next PR should focus on replacing the restore migration with reviewed forward domain migrations, using the Phase 17 inventory as the ownership checklist.
