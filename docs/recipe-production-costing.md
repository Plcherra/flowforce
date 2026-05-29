# Recipe And Production Costing

Phase: 05.03

FlowForce production costing turns configured recipes into recorded production events, material usage, inventory adjustments, waste records, and output unit cost.

## Calculation Rules

- Recipe ingredients come from `inv_recipes`.
- Ingredient unit cost comes from `inv_items.cost_per_unit`.
- Ingredient quantities are converted from the recipe line unit to the ingredient item unit before costing or inventory deduction.
- Produced quantity is converted into the produced item's primary unit before increasing inventory.
- Actual yield, when provided, is converted into the item unit and used as the denominator for `unit_output_cost`.
- Waste, when provided, is converted into the item unit and logged to `inv_waste` with a production reason.
- Labor and overhead are added to material cost before calculating output unit cost.

## Safety Rules

- Production cannot be recorded when the produced unit cannot convert to the item unit.
- Ingredient lines with invalid conversion paths are recorded as uncosted preview lines and are not deducted from inventory.
- Missing ingredient costs produce warnings and a zero-cost material line.
- Material usage, production cost, recipe quantity, yield, and waste values must stay nonnegative at the database layer.
- Production adjustments use `reference_number = inv_production_events.id` so rollback and audit can trace output and consumption.

## Tables

| Table | Purpose |
| --- | --- |
| `inv_recipes` | Recipe ingredient, quantity, unit, and yield contract. |
| `inv_production_events` | Production batch header, output quantity, yield, waste, and cost totals. |
| `inv_production_materials` | Ingredient-level usage and cost captured for each production event. |
| `inv_adjustments` | Output increase and ingredient consumption inventory movements. |
| `inv_waste` | Production waste quantity and cost impact. |

## UI Surface

The production event form previews:

- Material cost.
- Labor and overhead.
- Cost per output unit.
- Required ingredient quantities.
- Conversion warnings and blocking conversion errors.

The production event list shows recorded output, material cost, labor, cost per unit, ingredient usage, approval status, and notes.

## Remaining Follow-Up

Phase 05.04 should use these production adjustments when calculating stock position, expected stock, and count variance.
