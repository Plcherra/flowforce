# Unified Shift Profitability

Date: 2026-05-28

Plan: 05 Inventory Finance Cost Engine

Phase: 05.08 Unified Shift Profitability

## Purpose

Unified shift profitability combines the cost-engine inputs into one manager-facing operating picture. It answers two practical questions:

- What is this shift or day expected to cost?
- What should a manager prepare because labor, stock, purchasing, waste, or expenses are creating risk?

This is still an operating-cost model, not final accounting profit. POS sales, payroll reconciliation, and accounting sync are future inputs.

## Inputs

- Labor: `cost_schedule_labor_v`
- Production: `cost_production_batches_v`
- Waste: `cost_waste_daily_v`
- Purchasing: `cost_purchase_receipts_v`
- Inventory posture: `inv_stock_positions` through `cost_inventory_shortage_v`
- Expenses: `expenses`
- Payments: `payments`

## Views

`cost_production_batches_v` exposes production batch cost by company, item, date, location, approval status, and output cost.

`cost_inventory_shortage_v` exposes active item stock posture by company, item, and location, including `stockout`, `below_minimum`, `overstocked`, and `ok` signals.

`cost_day_location_summary_v` aggregates labor, production, waste, purchasing, expenses, payments, and inventory signals by company, date, and location. This is the preferred source for day/location dashboards because it avoids multiplying unallocated expenses across every shift.

`cost_shift_summary_v` keeps one row per scheduled shift, joining schedule labor with same-day/location cost context and staffing signals.

## RPCs

`get_cost_engine_summary(company_id, start_date, end_date)` returns one tenant-scoped summary for dashboard cards:

- scheduled shifts
- labor hours and labor cost
- production, waste, purchasing, expense, and payment costs
- total operating cost
- shortage, overstock, overstaffing, and understaffing counts

`get_shift_cost_breakdown(company_id, start_date, end_date)` returns tenant-scoped shift rows from `cost_shift_summary_v`.

## Signals

Inventory signals:

- `shortage`: at least one active item is at or below minimum.
- `overstock`: at least one active item is above maximum.
- `ok`: no shortage or overstock signal exists.

Staffing signals:

- `overstaffed`: assigned headcount is above planned headcount.
- `understaffed`: assigned headcount is below planned headcount.
- `balanced`: assigned and planned headcount match.

## Dashboard And Reports

The command center now reads `get_cost_engine_summary` for today's unified cost pulse. Reports can request `shift_profitability` or `cost_engine` data from `cost_day_location_summary_v`.

## Follow-Up

- Plan 05.09 should add the owner financial overview and clearly separate estimated operating cost from imported/accounting-grade data.
- Future integrations should add POS sales and actual payroll so operating cost can become true profitability.
