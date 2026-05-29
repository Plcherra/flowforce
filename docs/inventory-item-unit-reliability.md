# Inventory Item And Unit Reliability

Date: 2026-05-28

Plan: 05 Inventory Finance Cost Engine

Phase: 05.02 Inventory Item And Unit Reliability

## Purpose

The cost engine cannot trust inventory math unless items, units, locations, suppliers, and costs are explicit. This phase makes incomplete item setup visible and stops bad unit conversions from silently becoming valid cost values.

## Canonical Tables Verified

| Domain | Tables |
| --- | --- |
| Items | `inv_items` |
| Item units | `inv_item_units` |
| Units | `inv_units` |
| Locations | `inv_locations` |
| Suppliers | `inv_suppliers` |
| Lots | `inv_stock_lots` |

## Reliability Rules

- `inv_items.cost_per_unit` must be null or non-negative.
- `inv_items.unit_quantity` must be null or greater than zero.
- `inv_item_units.conversion_factor` must be null or greater than zero.
- `inv_item_units.cost_per_unit` must be null or non-negative.
- `inv_units.conversion_factor` must be null or greater than zero.
- `inv_units.conversion_to_parent` must be null or greater than zero.
- `inv_stock_lots.quantity` must be null or non-negative.
- `inv_stock_lots.unit_cost` must be null or non-negative.

These rules are enforced for new writes by `supabase/migrations/20260528000200_phase5_inventory_item_unit_reliability.sql`.

## Unit Conversion Behavior

The shared conversion utility in `src/utils/inventoryUnits.ts` now separates compatibility conversion from strict conversion:

- `getConversionFactor` remains backward-compatible for older UI paths.
- `tryGetConversionFactor` returns `null` plus a reason when units cannot safely convert.
- `canConvertUnits` provides a simple boolean for setup validation.

Strict conversion fails when:

- A source or target unit is missing.
- A unit has invalid conversion metadata.
- A parent conversion chain contains a cycle.
- Units do not share a base unit.
- A target conversion factor is zero.

## Item Setup Health

Each inventory item loaded by `src/features/inventory/repositories/itemsRepository.ts` receives `setup_health`.

`setup_health.status` can be:

- `ready`: no blocking issues and no warnings.
- `warning`: usable for cost engine basics, but missing helpful reporting/purchasing context.
- `incomplete`: missing data that makes cost calculations unsafe.

Blocking issue examples:

- `missing_unit`: item needs a primary inventory unit.
- `missing_cost`: item needs a positive cost basis.
- `missing_primary_unit`: item unit hierarchy needs one primary unit.
- `missing_countable_unit`: item needs at least one countable unit.
- `invalid_item_unit_conversion`: item units cannot convert to the item unit.
- `invalid_recipe_conversion`: recipe units cannot convert to ingredient units.
- `invalid_unit_cost`: item unit costs cannot be negative or invalid.

Warning issue examples:

- `missing_location`: item should have a default location for counts and stock value.
- `missing_supplier`: item should have a preferred supplier for purchasing cost.
- `missing_category`: item should have a category for reporting.

## UI Surface

`src/features/inventory/pages/ItemsSetup.tsx` now shows:

- Overall setup readiness percentage.
- Cost-ready item count.
- Warning item count.
- Incomplete item count.
- Per-item setup badge.
- Top setup fixes needed per item.

## Why This Matters For Plan 05

Later phases will calculate recipe cost, stock value, waste impact, purchasing cost, and shift profitability. Those calculations must distinguish:

- Actual zero cost.
- Missing cost.
- Estimated cost.
- Invalid conversion.

Before this phase, some conversion failures could silently behave like `1x` conversions. That is dangerous for food/inventory cost. Now the repository can detect unsafe conversion paths and mark items incomplete instead of treating bad setup as valid cost data.

## Remaining Work For Later Phases

- Decide weighted-average, latest-received, FIFO, or configurable item cost basis.
- Confirm whether the weighted active-lot default in `cost_item_unit_basis_v` should remain the v1 policy or become configurable.
- Add correction workflows for duplicate primary item units.
- Expand location/supplier management UI.
- Validate old rows after the current data set is cleaned.
