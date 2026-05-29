# Owner Financial Overview

Plan 05.09 turns the finance screen into an owner-safe operating overview. The key rule is that FlowForce must not blend accounting-grade actuals, imported records, pending approvals, and cost-engine estimates without labels.

## Data Categories

- Actual revenue comes from non-demo sale rows in `inventory_transactions`.
- Actual expenses and payments come from approved or paid manual/system records.
- Imported cost comes from `expenses.data_source = 'imported'` and `payments.data_source = 'imported'`.
- Estimated cost comes from the cost engine: labor, production, waste, and purchasing rollups.
- Pending approvals remain separate from P&L totals until approved or paid.
- Sample/demo rows are excluded from the owner rollups through `data_source = 'sample'` and demo-reference filters.

## Database Contract

Phase 05.09 adds source/export metadata to `expenses` and `payments`:

- `data_source`
- `source_system`
- `import_batch_id`
- `external_id`
- `exported_at`
- `export_metadata`

It also adds:

- `owner_financial_daily_v`
- `owner_financial_export_v`
- `get_owner_financial_overview(company_id, start_date, end_date)`
- `get_owner_financial_export(company_id, start_date, end_date)`

All views and RPCs stay tenant-scoped through RLS/security-invoker behavior and `current_user_company_ids()`.

## Product Behavior

The manager/owner finance overview now surfaces:

- Actual revenue.
- Actual cost.
- Imported cost.
- Estimated operational cost.
- Net operating position.
- Expense and payment approval queues.
- CSV export for the separated summary.

The production-facing manager screen no longer exposes the old sample-data generator. Demo records may still exist in development utilities, but owner financial summaries must never treat those records as unlabeled actuals.

## Verification

- `npm run check:owner-financial-overview`
- `npm run typecheck:src`
- `npm run check:local`
- `supabase db reset`
- `npm run test:db:security`
