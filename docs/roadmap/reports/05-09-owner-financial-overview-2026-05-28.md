# 05.09 Owner Financial Overview

Date: 2026-05-28

## Scope

Completed the owner P&L-style overview for the cost engine plan.

## Changes

- Added source/export metadata to `expenses` and `payments`.
- Added `owner_financial_daily_v` and `owner_financial_export_v`.
- Added `get_owner_financial_overview` and `get_owner_financial_export`.
- Updated the manager finance screen to separate actual, imported, estimated, and pending approval totals.
- Added a CSV export action for the owner summary.
- Removed the production-facing sample financial data generator action from the manager finance screen.
- Added a contract check for the owner financial overview.

## Acceptance

Owners can now see operating cost without jumping across scheduling, inventory, expense, and payment views. The screen labels actual records, imported records, estimated operational cost, and pending approvals separately.

## Verification

- `npm run check:owner-financial-overview`
- `npm run typecheck:src`
- `npm run check:local`
- `npm run build`
- `supabase db reset`
- `npm run test:db:security`

## Next

05.10 Cost Engine Signoff.
