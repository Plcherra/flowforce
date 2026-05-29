# 05.07 Labor And Schedule Cost

Date: 2026-05-28

Plan: [05 Inventory Finance Cost Engine](../05-inventory-finance-cost-engine.md)

## Completed

- Added tenant-scoped scheduled labor cost views.
- Added a schedule labor cost RPC for report/API use.
- Connected planned labor cost to schedule duration, unpaid breaks, headcount, and hourly-rate estimates.
- Added role, department, and location labor breakdown support.
- Prepared `labor_entries` for future actual labor imports.
- Updated command-center labor calculations to use the canonical schedule labor formula.

## Files

- [Schedule Labor Cost](../../schedule-labor-cost.md)
- `supabase/migrations/20260528000700_phase5_schedule_labor_cost.sql`
- `src/services/costing/scheduleLabor.ts`
- `src/features/dashboard/hooks/useOperatorCommandCenterData.ts`
- `scripts/check-schedule-labor-cost-contract.mjs`

## Verification

- `npm run check:schedule-labor-cost`
- `npx eslint src/services/costing/scheduleLabor.ts src/features/dashboard/hooks/useOperatorCommandCenterData.ts scripts/check-schedule-labor-cost-contract.mjs --max-warnings=0`
- `npm run typecheck:src`
- `npm run build`
- `npm run check:local`
- `supabase db reset`
- `npm run test:db:security`

## Migration To Push

```bash
supabase db push
```

Expected migration:

```text
20260528000700_phase5_schedule_labor_cost.sql
```

## Next Phase

05.08 Unified Shift Profitability.
