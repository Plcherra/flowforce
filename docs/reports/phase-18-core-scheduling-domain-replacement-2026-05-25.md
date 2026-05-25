# Phase 18 - Core And Scheduling Domain Replacement

Date: 2026-05-25

## Goal

Start replacing the legacy restore migration with reviewed forward domain ownership, beginning with core tenant/auth tables and the scheduling/calendar placeholder views.

## Completed

- Added `supabase/migrations/20260525000100_phase18_core_scheduling_domain_replacement.sql`.
- Added future-facing core constraints for tenant-owned rows:
  - `company_members.company_id` and `company_members.user_id` required for new rows.
  - `company_roles.company_id`, `positions.company_id`, and `system_settings.company_id` required for new rows.
  - `company_members`, `company_roles`, `positions`, `system_settings`, `audit_log`, `system_logs`, and `company_invites` now have forward foreign-key ownership back to `companies` where appropriate.
- Added an `audit_logs` compatibility view over canonical `audit_log` so app code has a stable read surface while `audit_log` remains the canonical table.
- Added a company ownership column, trigger, indexes, grants, and explicit RLS policy for `event_participants`.
- Replaced restore placeholder views with real security-invoker views:
  - `calendar_events_full`
  - `calendar_unified_view`
  - `vendor_event`
- Added explicit RLS policies for:
  - `calendar_events`
  - `event_participants`
  - `event_shift_links`
  - `vendor_visits`
- Added `supabase/tests/phase18_core_scheduling_domain_contracts.test.sql`.
- Added the Phase 18 pgTAP suite to `npm run test:db:security`.
- Tightened `scripts/check-supabase-contract.mjs` so deploy checks now monitor `audit_logs`, `calendar_events_full`, `calendar_unified_view`, and `vendor_event`.

## Verification

- `env -u DOCKER_HOST supabase db reset` passed.
- `env -u DOCKER_HOST supabase test db --local supabase/tests/phase18_core_scheduling_domain_contracts.test.sql` passed.
- `env -u DOCKER_HOST npm run test:db:security` passed.
- Local Supabase contract check passed against the reset local stack:
  - 0 missing relations
  - 0 relation errors
  - 0 missing RPCs
  - 0 anon exposures
  - 0 security contract errors
- `supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --yes` applied the Phase 18 migration remotely.
- `env -u DOCKER_HOST npm run check:deploy` passed against the linked remote project: 24 local migrations and 24 remote migrations matched, with 0 remote schema/security contract errors.

## Remaining Work

- Continue restore replacement by domain:
  - people/HR
  - messages/announcements
  - forms/sections/documents
  - inventory/finance
  - learning/recognition/gamification
  - analytics/operations/copilot
- Once all domains own their explicit constraints, grants, and policies, retire the old restore migration as a historical stabilization artifact.
