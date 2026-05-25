# Phase 19 - People And Messages Domain Replacement

Date: 2026-05-25

## Goal

Continue replacing the legacy restore migration with reviewed forward contracts for people/HR and messages/announcements tables.

## Completed

- Added `supabase/migrations/20260525000200_phase19_people_messages_domain_replacement.sql`.
- Added required `company_id` ownership to restore-era people/message tables that previously inferred tenant context indirectly:
  - `employee_badge`
  - `employee_report`
  - `skill_matrix`
  - `staff_availability`
  - `staff_performance`
  - `announcement_reads`
  - `reminders`
  - `task_notifications`
- Added forward company ownership checks, company foreign keys, ownership indexes, profile foreign keys, and company-id inheritance triggers for people-owned, announcement-owned, and task-owned rows.
- Replaced generic restore containment policies with explicit tenant policies for:
  - `employees`
  - `employee_badge`
  - `employee_report`
  - `employee_report_summary`
  - `hr_roster_cache`
  - `skill_matrix`
  - `staff_availability`
  - `staff_performance`
  - `compliance_rules`
  - `announcements`
  - `announcement_reads`
  - `reminders`
  - `task_notifications`
- Added `supabase/tests/phase19_people_messages_domain_contracts.test.sql` covering two-tenant visibility, trigger-based company inheritance, and cross-tenant write rejection.
- Added the Phase 19 pgTAP suite to `npm run test:db:security`.
- Tightened `scripts/check-supabase-contract.mjs` so deploy checks now monitor the people/HR and messages/announcements restore-replacement tables.

## Verification

- `env -u DOCKER_HOST supabase db reset` passed.
- `env -u DOCKER_HOST supabase test db --local supabase/tests/phase19_people_messages_domain_contracts.test.sql` passed.
- `env -u DOCKER_HOST npm run test:db:security` passed.
- Local Supabase contract check passed against the reset local stack:
  - 0 missing relations
  - 0 relation errors
  - 0 missing RPCs
  - 0 anon exposures
  - 0 security contract errors
- `supabase db push --linked --password "$SUPABASE_DB_PASSWORD" --yes` applied the Phase 19 migration remotely.
- `env -u DOCKER_HOST npm run check:deploy` passed against the linked remote project: 25 local migrations and 25 remote migrations matched, with 0 remote schema/security contract errors.

## Remaining Work

- Continue restore replacement by domain:
  - forms/sections/documents
  - inventory/finance
  - learning/recognition/gamification
  - analytics/operations/copilot
- Once all domains own their explicit constraints, grants, and policies, retire the old restore migration as a historical stabilization artifact.
