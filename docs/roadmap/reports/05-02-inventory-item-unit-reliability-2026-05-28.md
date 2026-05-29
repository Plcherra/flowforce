# 05.02 Inventory Item And Unit Reliability

Date: 2026-05-28

Plan: [05 Inventory Finance Cost Engine](../05-inventory-finance-cost-engine.md)

## Completed

- Verified the Plan 05 item/unit source tables: `inv_items`, `inv_item_units`, `inv_units`, `inv_locations`, `inv_suppliers`, and `inv_stock_lots`.
- Hardened shared unit conversion behavior in `src/utils/inventoryUnits.ts`.
- Added strict conversion helpers so invalid conversions can be detected instead of silently treated as `1x`.
- Added per-item `setup_health` with ready/warning/incomplete status.
- Surfaced setup completeness cards and item-level setup badges in Items & Setup.
- Added database guardrails for non-negative costs and positive conversion factors.
- Added `npm run check:inventory-reliability` and wired it into local/release gates.

## Key Decisions

- Missing cost basis is not zero cost.
- Missing conversion path makes an item cost-incomplete.
- Location, supplier, and category gaps are warnings, not blockers.
- Item/unit conversion factors must be positive.
- Existing rows are not force-validated until data cleanup is intentionally run; new writes get guardrails now.

## Verification

- `npm run check:inventory-reliability`
- `npm run check:local`
- `npm run typecheck`
- `git diff --check`

## Remote Migration Needed

Push before relying on the new database guardrails remotely:

- `supabase/migrations/20260528000200_phase5_inventory_item_unit_reliability.sql`

## Next

Start 05.03: Recipe And Production Costing.
