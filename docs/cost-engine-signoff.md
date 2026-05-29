# Cost Engine Signoff

Date: 2026-05-28

Plan: 05 Inventory Finance Cost Engine

Phase: 05.10 Cost Engine Signoff

## Product Positioning

FlowForce's v1 differentiator is the connected operating cost engine: owners and managers can see schedule labor, inventory position, purchasing, production, waste, expenses, payments, and source-labeled owner finance in one tenant-safe product.

The sellable sentence:

> FlowForce shows operators what the next shift will cost, where margin is leaking, and which approvals or inventory actions need attention before the day gets expensive.

## What Is Signed Off

- Labor cost estimates from schedules, headcount, break minutes, and hourly rates.
- Inventory item/unit reliability for cost basis.
- Recipe and production output cost.
- Count and stock-position rollups.
- Purchasing and supplier receipt flow.
- Waste and adjustment intelligence.
- Shift/day/location profitability summaries.
- Owner financial overview with actual, imported, estimated, and pending approval separation.
- Cost dashboard/report hooks that expose the above in the app.

## Regression Coverage

`supabase/tests/phase5_cost_engine_regression.test.sql` verifies:

- Schedule labor cost equals net shift hours times headcount times rate.
- Unpaid break minutes reduce net labor hours.
- Daily summaries include approved production and waste cost impact.
- Cost-engine RPCs expose labor, production, and waste totals.
- Owner overview separates actual revenue, actual expenses, actual payments, imported cost, estimated operating cost, and pending approvals.
- Owner net position excludes pending approvals.
- Demo revenue and sample expenses are excluded from owner actuals.

The signoff migration `20260528001000_phase5_cost_engine_signoff_grants.sql` also grants authenticated access to the invoker views used by composed cost summaries:

- `inv_stock_positions`
- `cost_purchase_receipts_v`
- `cost_waste_events_v`
- `cost_waste_daily_v`

The audit-closure migration `20260528001100_phase5_cost_basis_artifact_closure.sql` implements the remaining planned cost-basis artifacts and protects composed cost summaries from old demo/sample finance rows:

- `cost_item_unit_basis_v`
- `cost_inventory_position_v`
- `recalculate_item_cost_basis`
- `cost_day_location_summary_v` sample/demo finance exclusion

## Demo Script Update

The Plan 01 demo now centers the cost engine in three beats:

1. Dashboard: today's labor, stock, waste, and operating cost risk.
2. Inventory/purchasing: one count, one shortage, one purchase need, one production batch, and one waste event.
3. Owner financial overview: actual, imported, estimated, and pending approval totals are visibly separated.

Demo seed data must mark records by source:

- `manual` or `system` for actual customer-entered operational data.
- `imported` for POS/accounting/vendor-imported records.
- `estimated` for forecasted or calculated operational cost.
- `sample` only for local/demo records that must never appear as production actuals.

## Release Gates

The signoff is wired into:

- `npm run check:cost-engine-signoff`
- `npm run check:local`
- `npm run check:release`
- `npm run test:db:security`

## Remaining Risks

- Actual labor imports and POS/accounting integrations are still future integration phases.
- Purchasing allocation across multiple days/locations remains a later refinement.
- Item cost basis now has a weighted active-lot default, but the final business decision still needs confirmation: weighted average, latest received, FIFO lot, or configurable.
