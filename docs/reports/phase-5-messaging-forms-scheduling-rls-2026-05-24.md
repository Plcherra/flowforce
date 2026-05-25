# Phase 5 Messaging, Forms, and Scheduling RLS

Date: 2026-05-24

## Goal

Close the next tenant-isolation gaps after Phase 4 by giving messaging, forms, and scheduling support tables first-class company ownership.

## Implemented

- Added `supabase/migrations/20260524000600_phase5_messaging_forms_scheduling_rls.sql`.
- Added/backfilled `company_id` for:
  - `message_channels`
  - `channel_members`
  - `messages`
  - `message_reactions`
  - `forms`
  - `form_fields`
  - `form_submissions`
  - `schedule_assignments`
  - `time_off_requests`
  - `user_unavailability`
- Added trigger-based company ownership derivation so existing inserts can inherit tenant context from parent rows or profiles.
- Enabled RLS and company-scoped policies for messaging, forms, schedules, schedule support tables, templates, time off, and unavailability.
- Updated app paths so channel/form/template creation passes or filters by company context where appropriate.
- Expanded `scripts/check-supabase-contract.mjs` to verify 41 RLS tables.
- Added `supabase/tests/phase5_messaging_forms_scheduling_isolation.test.sql`.
- Updated `npm run test:db:security` to run Phase 3, Phase 4, and Phase 5 isolation suites.

## Validation

Commands run successfully:

```sh
env -u DOCKER_HOST npx supabase db reset
env -u DOCKER_HOST npm run test:db:security
env -u DOCKER_HOST npx supabase db push --dry-run
env -u DOCKER_HOST npx supabase db push --yes
env -u DOCKER_HOST npx supabase gen types typescript --linked
npm run check:supabase
npm run typecheck
```

Remote migration status after push:

```text
Remote database is up to date.
```

Security contract after Phase 5:

```text
OK 41 RLS tables (10 core, 31 business), 9 buckets, 7 storage policies
0 anon exposures
0 security contract errors
```

## Test Coverage Added

The Phase 5 pgTAP suite proves Tenant A only sees its own rows for:

- message channels
- channel members
- messages
- message reactions
- forms
- form fields
- form submissions
- schedules
- schedule assignments
- shift templates
- week templates
- time off requests
- user unavailability

It also verifies trigger-derived company ownership for message, form-field, and schedule-assignment inserts, and blocks cross-tenant channel/time-off creation.

## Remaining Work

- Storage paths still need company-prefixed keys or signed URL rules for form/report buckets.
- Scheduling still has additional domain tables and workflow edge cases that need seeded smoke coverage.
- Analytics and operations tables need the same two-tenant treatment.
- The onboarding API should be routed through the idempotent setup RPC.
- The giant restore migration should be replaced with reviewed domain migrations.
