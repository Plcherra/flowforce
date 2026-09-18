# Counts And Stock Position

Phase: 05.04

FlowForce count workflows now use a derived stock position as the expected quantity for physical counts.

## Stock Position Source

Expected stock comes from `public.inv_stock_positions`, a security-invoker view over:

- Active `inv_stock_lots` quantities.
- Positive `inv_adjustments` such as increases, receipts, and production output.
- Negative `inv_adjustments` such as decreases, usage, waste, and production consumption.
- Transfer-style adjustments, split between source and destination locations.

The view groups by `company_id`, `item_id`, and `location_id`, so count scopes can calculate expected stock for selected locations without crossing tenants.

## Count Line Rules

- New count lines receive `expected_quantity` from stock position.
- Expected quantity is converted into each countable item unit by `conversion_factor`.
- Counted quantity must stay nonnegative.
- Saved count lines write `variance = counted_quantity - expected_quantity`.
- Missing lines are lines without a saved count timestamp and without entered quantity.

## Supervisor Review Signals

The count detail screen surfaces:

- Counted line completion.
- Missing count lines.
- Lines with nonzero variance.
- Net variance across visible count lines.

These signals are shown on the count sheet so the person counting can check missing lines and net variance before they leave.

## Approval Writes Stock

Save & Done is the moment counted quantities become on-hand. The count stays registered on the list and can be opened, edited, and saved again. A restaurant opening or closing count does not wait for a second approver. FlowForce writes `inv_adjustments` rows (`increase` or `decrease`) from counted minus expected, converted to base units. Later edits write corrections. `inv_stock_positions` then drives the next count's expected quantity and dashboard value.

## Remaining Follow-Up

Phase 05.05 should update stock and cost basis from purchasing receipts. Phase 05.06 should deepen waste and adjustment intelligence from the same stock movement model.
