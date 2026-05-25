# Phase 4 Business Table RLS

Date: 2026-05-24

## Goal

Extend tenant isolation beyond onboarding/core tables into high-risk business modules.

## Implemented

- Added `supabase/migrations/20260524000500_phase4_business_table_rls.sql`.
- Added `company_id` columns to legacy finance/inventory tables that the app already treats as tenant-scoped:
  - `payments`
  - `expenses`
  - `inventory_items`
  - `inventory_transactions`
- Backfilled those `company_id` values from related profile/item data where possible.
- Enabled RLS and authenticated grants for 14 business tables:
  - `tasks`
  - `task_comments`
  - `goals`
  - `goal_tasks`
  - `calendar_events`
  - `event_participants`
  - `event_shift_links`
  - `company_updates`
  - `company_update_comments`
  - `company_update_reactions`
  - `payments`
  - `expenses`
  - `inventory_items`
  - `inventory_transactions`
- Added company-scoped policies for read/write access on those tables.
- Updated payment writes/reads in `src/hooks/usePayments.tsx` so they require and filter by company context.
- Updated inventory transaction writes in `src/features/inventory/hooks/useInventoryTransactions.tsx` so they require and write company context.
- Expanded `scripts/check-supabase-contract.mjs` so the security contract now checks 24 RLS tables: 10 core and 14 business.
- Added `supabase/tests/phase4_business_tenant_isolation.test.sql`.
- Updated `npm run test:db:security` to run both Phase 3 and Phase 4 pgTAP suites.

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
node --check scripts/check-supabase-contract.mjs
git diff --check
```

Remote migration status after push:

```text
Remote database is up to date.
```

Security contract after Phase 4:

```text
OK 24 RLS tables (10 core, 14 business), 9 buckets, 7 storage policies
0 anon exposures
0 security contract errors
```

## Test Coverage Added

The Phase 4 pgTAP suite proves Tenant A only sees its own rows for:

- tasks
- calendar events
- event participants
- event shift links
- company updates
- company update comments
- company update reactions
- payments
- expenses
- inventory items
- inventory transactions

It also verifies Tenant A can insert its own task, cannot insert a Tenant B payment, cannot update a Tenant B company update, and still cannot see Tenant B payments afterward.

## Remaining Work

- Messaging still needs a deeper tenant model. `messages` scopes through `message_channels` and `channel_members`, but `message_channels` does not yet have `company_id`.
- Forms still need a company ownership model. `forms` and `form_submissions` currently lack direct company scoping.
- Scheduling needs the same treatment for `schedules`, `schedule_assignments`, rulebooks, templates, and time-off tables.
- Inventory should be migrated fully to the newer `inv_*` tables or the legacy `inventory_*` tables should be brought to the same company-scoped standard.
- After domain cleanup, split the giant restore migration into reviewed domain migrations.
