# 05.01 Canonical Cost Model

Date: 2026-05-28

Plan: [05 Inventory Finance Cost Engine](../05-inventory-finance-cost-engine.md)

## Completed

- Defined canonical meanings for `labor_cost`, `inventory_cost`, `purchasing_cost`, `waste_cost`, `production_cost`, and `shift_cost`.
- Mapped each cost term to existing Supabase tables and fields.
- Chose `inv_*` inventory and purchasing tables as the Plan 05 source of truth.
- Kept legacy `inventory_*` and `purchase_orders` tables as compatibility/migration inputs only.
- Defined precision, currency, tenant, and permission rules.
- Added a machine-readable contract at `src/services/costing/costEngineContract.json`.
- Added `npm run check:cost-engine` to prevent the cost model doc, contract, and schema mapping from drifting.

## Key Decisions

- Use `companies.currency` as the tenant currency source.
- Use PostgreSQL `numeric` for cost values.
- Calculate at scale `6`; display at scale `2`.
- Missing cost basis is a setup/completeness issue, not a zero value.
- Scheduled labor is estimated until `labor_entries` is expanded for payroll/clock imports.
- Production `unit_output_cost` becomes authoritative only after approval.

## Verification

- `npm run check:cost-engine`
- `npm run check:local`
- `npm run typecheck`
- `git diff --check`

## Next

Start 05.02: Inventory Item And Unit Reliability.
