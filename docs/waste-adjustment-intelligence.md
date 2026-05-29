# Waste And Adjustment Intelligence

Phase 05.06 makes waste and manual adjustments part of the same measurable cost engine as purchasing, counts, stock lots, and production.

## Waste Recording

Waste events are stored in `inv_waste` with:

- Item, location, unit, and quantity.
- Waste type and reason category.
- Cost impact.
- Optional shift reference and metadata.

When waste is recorded, FlowForce also writes an `inv_adjustments` row with `adjustment_type = waste`. This is the stock-affecting movement used by `inv_stock_positions`, so waste reduces available stock and stock value.

## Cost Impact

Cost impact is calculated as:

```text
waste quantity * latest item cost_per_unit
```

The Actions form passes an estimate from the selected item. The service recalculates the value from the database item record before writing, so stale browser state cannot be the only source of cost truth.

## Adjustment Recording

Manual inventory adjustments now write real `inv_adjustments` rows. They include:

- Company scope.
- Item and location.
- Increase or decrease type.
- Quantity.
- Cost impact from latest item cost.
- Reason and metadata.

Positive and negative stock movements continue to flow through `inv_stock_positions`.

## Classification

Waste gets a reason category from the selected waste type and reason text:

- `expiration`
- `prep_error`
- `spoilage`
- `damage`
- `theft`
- `unclassified`

This gives managers a stable reporting dimension even when notes are free-form.

## Views

`cost_waste_events_v` exposes detailed waste records for reporting.

`cost_waste_daily_v` groups waste by company, date, location, item, type, and reason category.

The Waste page now surfaces:

- Total waste records.
- Total quantity.
- Total cost impact.
- 7-day trend.
- Highest-impact type, item, and location.
- High-cost outliers.

## Follow-Up

Phase 05.07 should connect schedule and labor cost so the cost engine can attach waste and adjustments to shifts when enough shift context exists.
