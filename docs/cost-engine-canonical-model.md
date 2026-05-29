# Cost Engine Canonical Model

Date: 2026-05-28

Plan: 05 Inventory Finance Cost Engine

Phase: 05.01 Canonical Cost Model

## Purpose

This document defines the cost language FlowForce will use across inventory, purchasing, production, scheduling, dashboard, reports, and future AI recommendations. Later phases can change implementation details, but they should not invent new meanings for these terms.

## Source Of Truth

- Tenant membership source: `company_members`.
- Tenant key: `company_id`.
- Currency source: `companies.currency`.
- Inventory source of truth: `inv_items`, `inv_item_units`, `inv_units`, and `inv_stock_lots`.
- Purchasing source of truth: `inv_purchases` and `inv_purchase_lines`.
- Scheduled labor estimate source of truth: `schedules`.
- Actual labor future source: `labor_entries`.
- Legacy compatibility sources: `inventory_items`, `inventory_transactions`, `purchase_orders`, and `purchase_order_items` may be read for migration/compatibility only. New cost engine calculations should prefer the `inv_*` domain.

## Precision And Currency

- Database values use `numeric`.
- Internal calculations use scale `6`.
- Presentation uses scale `2`.
- Round only at persisted rollups and presentation boundaries.
- Currency defaults to `companies.currency`.
- No cross-company currency aggregation is allowed.
- No mixed-currency aggregation is allowed unless a later FX/import phase records explicit conversion metadata.

## Canonical Components

### labor_cost: Labor cost

Definition: Scheduled labor estimate from shift duration, unpaid break minutes, required headcount, and hourly rate.

Formula: `net_shift_hours * required_headcount * hourly_rate`

Current table mapping:

| Table | Fields |
| --- | --- |
| `schedules` | `company_id`, `start_time`, `end_time`, `break_minutes`, `required_headcount`, `hourly_rate`, `location`, `position_id`, `is_published`, `status` |
| `labor_entries` | `company_id`, `created_at`, `updated_at` |

Rules:

- `net_shift_hours` is max(`end_time - start_time - break_minutes`, 0).
- `required_headcount` defaults to 1 when missing.
- Missing or non-positive `hourly_rate` means the shift is missing cost basis, not zero-cost labor.
- `labor_entries` is reserved for future actual labor imports and clock/payroll integrations.

### inventory_cost: Inventory cost

Definition: Current stock value based on item/unit cost basis and lot quantities when lots exist.

Formula: `quantity_in_base_unit * cost_per_base_unit`

Current table mapping:

| Table | Fields |
| --- | --- |
| `inv_items` | `company_id`, `cost_per_unit`, `unit_id`, `unit_quantity`, `default_location_id`, `is_active` |
| `inv_item_units` | `company_id`, `item_id`, `unit_id`, `conversion_factor`, `cost_per_unit`, `is_primary` |
| `inv_units` | `id`, `base_unit_id`, `conversion_factor`, `conversion_to_parent`, `unit_type` |
| `inv_stock_lots` | `company_id`, `item_id`, `location_id`, `quantity`, `unit_cost`, `is_active` |

Rules:

- Prefer lot `unit_cost` when stock lots exist.
- Otherwise use primary `inv_item_units.cost_per_unit`.
- Otherwise use `inv_items.cost_per_unit`.
- Unit conversions must be explicit before multiplying quantities by cost.
- Missing unit conversion means the item is cost-incomplete, not free.

### purchasing_cost: Purchasing cost

Definition: Committed and received supplier spend from purchase headers and line items.

Formula: `sum(line_total) or sum(quantity_received * unit_cost), reconciled to purchase total_amount`

Current table mapping:

| Table | Fields |
| --- | --- |
| `inv_purchases` | `company_id`, `supplier_id`, `order_date`, `expected_date`, `received_date`, `status`, `subtotal`, `tax_amount`, `total_amount` |
| `inv_purchase_lines` | `company_id`, `purchase_id`, `item_id`, `quantity_ordered`, `quantity_received`, `unit_cost`, `line_total`, `received_date` |

Rules:

- Ordered cost uses `quantity_ordered * unit_cost`.
- Received cost uses `quantity_received * unit_cost`.
- Header `total_amount` is the reconciliation target.
- Tax, delivery, and discounts should remain separated when fields become available; until then, use `tax_amount` and `total_amount`.

### waste_cost: Waste cost

Definition: Cost impact of discarded or unusable inventory, using persisted cost impact first and item cost fallback second.

Formula: `cost_impact ?? quantity * item_cost_basis`

Current table mapping:

| Table | Fields |
| --- | --- |
| `inv_waste` | `company_id`, `item_id`, `location_id`, `lot_id`, `quantity`, `cost_impact`, `waste_type`, `reason`, `waste_date` |
| `inv_items` | `company_id`, `cost_per_unit` |

Rules:

- Persisted `cost_impact` wins because it captures the cost at the time of waste.
- If `cost_impact` is missing, calculate from item/lot basis and mark the result estimated.
- Waste should be attributable to item, location, date, and reason before it appears in owner reports.

### production_cost: Production cost

Definition: Cost of produced/prepped inventory from material usage, labor cost, and overhead.

Formula: `material_cost + labor_cost + overhead_cost = total_output_cost; total_output_cost / produced_quantity = unit_output_cost`

Current table mapping:

| Table | Fields |
| --- | --- |
| `inv_production_events` | `company_id`, `item_id`, `produced_quantity`, `produced_unit_id`, `material_cost`, `labor_cost`, `overhead_cost`, `total_output_cost`, `unit_output_cost`, `produced_at`, `approval_status` |
| `inv_production_materials` | `company_id`, `production_id`, `ingredient_item_id`, `quantity_used`, `unit_id`, `unit_cost`, `total_cost`, `waste_quantity` |
| `inv_recipes` | `company_id`, `item_id`, `ingredient_id`, `quantity_needed`, `unit_id`, `yield_amount` |

Rules:

- Material cost comes from recipe/material lines at production time.
- Labor and overhead are explicit inputs until Plan 05 connects them to schedule/payroll and overhead policies.
- `unit_output_cost` is authoritative for produced item cost only after approval.
- Rejected or draft production events should not update owner cost summaries.

### shift_cost: Shift cost

Definition: Unified operating cost by shift/date/location from scheduled labor, production, waste, purchases, inventory movement, expenses, and payments.

Formula: `labor_cost + production_cost + waste_cost + allocated_purchasing_cost + allocated_expense_cost`

Current table mapping:

| Table | Fields |
| --- | --- |
| `schedules` | `company_id`, `start_time`, `end_time`, `location` |
| `inv_production_events` | `company_id`, `produced_at`, `total_output_cost` |
| `inv_waste` | `company_id`, `waste_date`, `cost_impact` |
| `inv_purchases` | `company_id`, `received_date`, `total_amount` |
| `expenses` | `company_id`, `expense_date`, `amount`, `currency`, `status` |
| `payments` | `company_id`, `paid_date`, `amount`, `currency`, `status` |

Rules:

- Shift attribution first uses explicit shift links when present.
- If no shift link exists, attribution can fall back to date and location.
- Estimated values must be labeled as estimated in owner and manager reports.
- Actual labor, actual sales, and imported payroll are future inputs, not assumed data.

## Required Views

These views should be created in later Plan 05 phases as contracts around the formulas above:

- `cost_item_unit_basis_v`: one current item/unit cost basis per tenant item.
- `cost_inventory_position_v`: current stock value by item and location.
- `cost_purchase_receipts_v`: ordered and received purchasing cost by purchase, item, supplier, and date.
- `cost_waste_events_v`: waste events with persisted or estimated cost impact.
- `cost_production_batches_v`: approved production batches with material, labor, overhead, output, and unit cost.
- `cost_schedule_labor_v`: scheduled labor hours/cost by shift, date, location, role, and status.
- `cost_inventory_shortage_v`: item stock posture and shortage/overstock signals by location.
- `cost_day_location_summary_v`: combined labor, production, waste, purchasing, expense, payment, and inventory signals by day/location.
- `cost_shift_summary_v`: unified shift/day/location cost summary.
- `owner_financial_daily_v`: owner-facing actual, imported, estimated, and pending approval rollup by day.
- `owner_financial_export_v`: export-ready monthly owner financial summary with source metadata.

## Required RPCs

- `get_cost_engine_summary`: tenant-scoped cost overview for dashboard/report ranges.
- `get_shift_cost_breakdown`: shift/date/location cost detail for manager review.
- `recalculate_item_cost_basis`: admin/service recalculation for item cost basis after purchase or recipe changes.
- `get_owner_financial_overview`: tenant-scoped owner P&L-style summary with actual, imported, estimated, and pending approval totals.
- `get_owner_financial_export`: export-ready owner financial summaries for reporting and accounting review.

## Tenant Rules

- Every tenant-owned input table must carry company_id.
- Every rollup/view must filter by company_id and current_user_company_ids().
- inv_units may be globally readable but item/unit price joins must be tenant scoped.
- No cross-company currency aggregation is allowed.

## Permission Rules

- Owners and admins can manage cost settings and corrections.
- Managers can view operational cost dashboards and create cost-affecting inventory records.
- Employees can create operational records only when feature permissions allow it.
- All cost overrides and recalculations must be audit logged.

## Open Decisions For Later Phases

- Whether item cost basis should be weighted average, latest received cost, FIFO lot cost, or company-configurable.
- How to allocate purchasing cost to shifts when a purchase supplies multiple days or locations.
- How actual labor import should reconcile with scheduled labor estimates.
- Whether sales/revenue belongs in Plan 05 shift profitability or remains owner overview only until integrations exist.

## Signoff Result

Phase 05.10 signs off the cost engine as the core v1 differentiator:

- Regression coverage now verifies key labor, production, waste, owner overview, pending approval, imported cost, and sample/demo exclusion calculations.
- Product copy positions the engine as the place where owners see what today will cost and what needs action.
- Demo data requirements now include source labels for actual, imported, estimated, pending, and sample records.
