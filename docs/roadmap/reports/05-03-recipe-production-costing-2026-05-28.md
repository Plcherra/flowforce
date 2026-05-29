# 05.03 Recipe And Production Costing

Date: 2026-05-28

## Summary

Phase 05.03 connected recipe ingredients, production output, yield, material usage, and waste to one costing path.

## Completed

- Reworked production calculations to use the strict unit conversion metadata from the inventory reliability phase.
- Added actual yield and waste conversion into the production cost result.
- Added total output cost, unit output cost, waste cost estimate, blocking issues, and recordability to the production calculation contract.
- Blocked production recording when output units cannot convert into the item's primary unit.
- Prevented unsafe ingredient inventory deductions when recipe units cannot convert to ingredient units.
- Logged production waste into `inv_waste` with a cost estimate and production reason.
- Added rollback cleanup for production adjustments and production waste when production event creation fails after partial writes.
- Added database constraints and indexes for recipe quantities, production costs, material costs, production references, and production waste lookups.
- Updated production preview UI to show blocking conversion issues and material warnings.

## Files

- [docs/recipe-production-costing.md](../../recipe-production-costing.md)
- [src/lib/inventory/production.ts](../../../src/lib/inventory/production.ts)
- [src/features/inventory/services/inventoryService.ts](../../../src/features/inventory/services/inventoryService.ts)
- [src/features/inventory/components/ProductionEventForm.tsx](../../../src/features/inventory/components/ProductionEventForm.tsx)
- [supabase/migrations/20260528000300_phase5_recipe_production_costing_contract.sql](../../../supabase/migrations/20260528000300_phase5_recipe_production_costing_contract.sql)

## Verification

- `npm run check:production-costing`
- `npx eslint src/lib/inventory/production.ts src/features/inventory/services/inventoryService.ts src/features/inventory/components/ProductionEventForm.tsx scripts/check-production-costing-contract.mjs --max-warnings=0`
- `npm run typecheck`
- `npm run check:local`
- `npm run build`
- `git diff --check`
- `DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock supabase db reset`
- `DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock npm run test:db:security`

## Remote Migration

Remote Supabase must apply:

- `supabase/migrations/20260528000300_phase5_recipe_production_costing_contract.sql`

## Next

Proceed to 05.04 Counts And Stock Position.
