# 05.06 Waste And Adjustment Intelligence

Date: 2026-05-28

## Completed

- Made waste recording calculate cost impact from the latest item cost basis.
- Made waste events create stock-affecting `inv_adjustments` rows with `adjustment_type = waste`.
- Made manual adjustment form submissions write real `inv_adjustments` rows.
- Added waste reason classification and reporting metadata.
- Added `cost_waste_events_v` and `cost_waste_daily_v` reporting views.
- Added Waste page summary signals for trend, highest-impact dimensions, and high-cost outliers.
- Documented the stock/cost behavior in `docs/waste-adjustment-intelligence.md`.

## Verification

- `npm run check:waste-intelligence`
- `npx eslint src/features/inventory/services/inventoryService.ts src/features/inventory/hooks/useInventoryWaste.tsx src/features/inventory/routes/Actions.tsx src/features/inventory/routes/Waste.tsx src/features/inventory/routes/inventoryActionsHelpers.ts src/features/inventory/utils/wasteIntelligence.ts scripts/check-waste-intelligence-contract.mjs --max-warnings=0`
- `npm run typecheck:src`
- `npm run check:local`
- `npm run build`
- `git diff --check`
- `DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock supabase db reset`
- `DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock npm run test:db:security`

## Migration

Push this migration before testing remote waste and adjustment reporting:

- `supabase/migrations/20260528000600_phase5_waste_adjustment_intelligence.sql`

## Next

Proceed to 05.07 Labor And Schedule Cost.
