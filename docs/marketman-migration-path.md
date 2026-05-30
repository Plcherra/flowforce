# MarketMan Migration Path

Date: 2026-05-30
Roadmap phase: 09.05 MarketMan Migration Path

## Goal

FlowForce should let an inventory-heavy operator move item, supplier, purchase, recipe, count, and waste history safely enough for the cost engine to remain trustworthy.

09.05 defines the MarketMan-style migration contract without adding live API sync. It validates imported units and cost basis before any recipe, count, or waste data is considered ready for customer cutover.

## Imported Data

The v1 migration path covers:

- Items: SKU, name, category, base unit, preferred supplier, fallback unit cost.
- Units: unit name, abbreviation, dimension, base unit, conversion factor.
- Suppliers: supplier identity and contact metadata.
- Purchases: supplier, item, quantity, unit, unit cost, purchase date.
- Recipes: recipe item, yield, ingredients, ingredient quantities, ingredient units.
- Counts: item, quantity, unit, count date, location.
- Waste: item, quantity, unit, reason, waste date.

The canonical contract lives in `src/services/integrations/marketmanMigrationPath.ts`.

## Unit Conversion Validation

Imported units must have:

- Unique abbreviations.
- Positive conversion factors.
- A known dimension: `count`, `weight`, or `volume`.
- Matching dimensions between source and target units.

Recipes, purchases, counts, and waste are blocked when their units cannot convert into the item base unit.

## Cost Basis Validation

Each item needs either:

- Purchase history that can create weighted average unit cost in the item base unit.
- A non-negative fallback item unit cost.

Purchase quantities must be positive. Unit costs cannot be negative.

The migration report exposes item cost basis as either `weighted_purchase_average` or `default_item_cost`.

## Cost Engine Readiness

Recipe costing is ready only when every ingredient has item data, unit conversion, and cost basis.

Waste costing is ready only when every waste quantity can convert into the item base unit and multiply by the item cost basis.

Counts are ready only when every count line item exists, has non-negative quantity, and can convert into the item base unit.

## Completion Report

The inventory setup completeness report includes:

- Imported object counts for items, units, suppliers, purchases, recipes, counts, and waste.
- Unit conversion readiness.
- Cost basis readiness.
- Recipe costing readiness.
- Count and waste import readiness.
- Cost basis previews.
- Recipe cost previews.
- Waste cost previews.
- Blocking issues and next actions.

## Verification

09.05 is complete when:

- `npm run check:marketman-migration` passes.
- Sample inventory export validates unit conversion.
- Sample inventory export produces item cost basis.
- Sample recipe preview supports cost-engine calculations.
- Sample waste preview produces cost impact.
