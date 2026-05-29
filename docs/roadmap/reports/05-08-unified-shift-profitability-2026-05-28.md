# 05.08 Unified Shift Profitability

Date: 2026-05-28

Plan: [05 Inventory Finance Cost Engine](../05-inventory-finance-cost-engine.md)

## Completed

- Added production, inventory shortage, day/location, and shift cost summary views.
- Added `get_cost_engine_summary` and `get_shift_cost_breakdown`.
- Combined labor, production, waste, purchasing, expenses, payments, and inventory signals.
- Added shortage, overstock, overstaffing, and understaffing signals.
- Connected the dashboard command center cost pulse to the unified cost summary.
- Added report data mappings for `shift_profitability` and `cost_engine`.

## Files

- [Unified Shift Profitability](../../unified-shift-profitability.md)
- `supabase/migrations/20260528000800_phase5_unified_shift_profitability.sql`
- `src/features/dashboard/hooks/useOperatorCommandCenterData.ts`
- `src/features/dashboard/components/OperatorCommandCenter.tsx`
- `src/hooks/useReports.tsx`
- `scripts/check-unified-shift-profitability-contract.mjs`

## Verification

- `npm run check:unified-shift-profitability`
- `npx eslint src/features/dashboard/hooks/useOperatorCommandCenterData.ts src/features/dashboard/components/OperatorCommandCenter.tsx src/hooks/useReports.tsx scripts/check-unified-shift-profitability-contract.mjs --max-warnings=0`
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
20260528000800_phase5_unified_shift_profitability.sql
```

## Next Phase

05.09 Owner Financial Overview.
