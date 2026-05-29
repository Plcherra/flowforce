# 05.04 Counts And Stock Position

Date: 2026-05-28

## Summary

Phase 05.04 connected inventory counts to a derived stock-position model so count lines can compare expected stock against physical counts.

## Completed

- Added the `public.inv_stock_positions` view over active stock lots and signed inventory adjustments.
- Added count line constraints for nonnegative expected and counted quantities.
- Added count/date/item indexes for count workflow and stock-position lookups.
- Updated count creation to bootstrap expected quantities from stock position.
- Converted expected quantities into each countable unit using item unit conversion factors.
- Updated saved count lines to write variance.
- Added count summary helpers for missing lines, completion, variance lines, and net variance.
- Added supervisor-facing count summary cards to count detail.
- Added missing and variance badges to the count table.
- Added phase documentation and a contract check.

## Files

- [docs/counts-stock-position.md](../../counts-stock-position.md)
- [src/features/inventory/utils/stockPosition.ts](../../../src/features/inventory/utils/stockPosition.ts)
- [src/features/inventory/repositories/countsRepository.ts](../../../src/features/inventory/repositories/countsRepository.ts)
- [src/features/inventory/routes/CountDetail.tsx](../../../src/features/inventory/routes/CountDetail.tsx)
- [src/features/inventory/components/MarketManCountingInterface.tsx](../../../src/features/inventory/components/MarketManCountingInterface.tsx)
- [supabase/migrations/20260528000400_phase5_counts_stock_position_contract.sql](../../../supabase/migrations/20260528000400_phase5_counts_stock_position_contract.sql)

## Verification

- `npm run check:counts-stock`
- `npx eslint src/features/inventory/utils/stockPosition.ts src/features/inventory/repositories/countsRepository.ts src/features/inventory/routes/CountDetail.tsx src/features/inventory/components/MarketManCountingInterface.tsx scripts/check-counts-stock-contract.mjs --max-warnings=0`
- `npm run typecheck`
- `npm run check:local`
- `npm run build`
- `git diff --check`
- `DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock supabase db reset`
- `DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock npm run test:db:security`

## Remote Migration

Remote Supabase must apply:

- `supabase/migrations/20260528000400_phase5_counts_stock_position_contract.sql`

## Next

Proceed to 05.05 Purchasing And Supplier Flow.
