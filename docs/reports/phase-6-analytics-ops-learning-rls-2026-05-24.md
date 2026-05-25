# Phase 6 Analytics, Operations, Learning, and Recognition RLS

Date: 2026-05-24

## Goal

Extend tenant isolation into analytics, operations, learning, recognition, gamification, vendor visit, and document/reporting tables.

## Implemented

- Added `supabase/migrations/20260524000700_phase6_analytics_ops_learning_rls.sql`.
- Added/backfilled `company_id` for:
  - `goal_rewards`
  - `gamification_xp`
- Enabled RLS and company-scoped policies for:
  - `kpi_insights`
  - `idea_actions`
  - `idea_cycles`
  - `ops_issues`
  - `ops_automation_suggestions`
  - `ops_kpi_snapshots`
  - `performance_reviews`
  - `daily_insights`
  - `engagement_scores`
  - `documents`
  - `vendor_visits`
  - `gamification_leaderboard`
  - `gamification_xp`
  - `badge_catalog`
  - `employee_certifications`
  - `learning_completions`
  - `training_assignments`
  - `recognition_award_rules`
  - `recognition_events`
  - `goal_rewards`
- Added trigger-based company ownership derivation for goal rewards and gamification XP.
- Set key views to `security_invoker` so underlying RLS is honored:
  - `recognitions`
  - `vendor_event`
  - `calendar_events_full`
  - `calendar_unified_view`
- Expanded `scripts/check-supabase-contract.mjs` to verify 61 RLS tables.
- Added `supabase/tests/phase6_analytics_ops_learning_isolation.test.sql`.
- Updated `npm run test:db:security` to run Phase 3 through Phase 6 suites.

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

Security contract after Phase 6:

```text
OK 61 RLS tables (10 core, 51 business), 9 buckets, 7 storage policies
0 anon exposures
0 security contract errors
```

## Test Coverage Added

The Phase 6 pgTAP suite proves Tenant A only sees its own rows for analytics, operations, documents, vendor visits, gamification, learning, and recognition tables. It also verifies trigger-derived company ownership for gamification XP and goal rewards, blocks cross-tenant ops issue creation, and confirms the `recognitions` view is tenant-scoped.

## Remaining Work

- Storage path hardening remains: form/report/message uploads need company-prefixed keys or signed URL rules.
- Onboarding should be routed fully through the idempotent setup RPC and covered by browser/API E2E.
- The app shell should replace missing tenant-context null states with a polished repair/setup-required screen.
- The giant restore migration should be replaced with reviewed domain migrations.
- Add seeded module smoke tests for the now-protected feature areas.
