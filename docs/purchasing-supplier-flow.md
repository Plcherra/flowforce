# Purchasing And Supplier Flow

Phase 05.05 connects the existing purchase-order screen to the canonical cost-engine inventory tables.

## Source Of Truth

FlowForce still reads the working purchase-order UI from the compatibility tables:

| UI table | Purpose |
| --- | --- |
| `purchase_orders` | Purchase order header shown in the Purchasing screen. |
| `purchase_order_items` | Purchase order lines shown in approval, receiving, history, and invoice flows. |

Every new or received purchase is mirrored into the canonical cost-engine tables:

| Cost-engine table | Purpose |
| --- | --- |
| `inv_purchases` | Canonical supplier purchase header. |
| `inv_purchase_lines` | Canonical item-level purchase lines and received quantities. |
| `inv_stock_lots` | Received supplier inventory by item, location, unit cost, and lot. |
| `inv_adjustments` | Receipt audit rows with `adjustment_type = purchase_receipt`. |

## Supplier And Item Link

Creating a purchase order stores the supplier snapshot on both the compatibility purchase order and the canonical purchase header. When a receipt is posted for an inventory item, FlowForce updates the item with:

- Latest received `cost_per_unit`.
- Preferred supplier when a supplier is attached to the purchase.

This is the v1 cost-basis rule: latest received supplier cost wins. Weighted average, FIFO, and company-configurable costing remain follow-up options.

## Receiving Behavior

Receiving a purchase order now does four things:

1. Increments `purchase_order_items.received_quantity`.
2. Updates or creates the matching `inv_purchase_lines` receipt state.
3. Creates an active `inv_stock_lots` row for the received delta.
4. Updates `inv_items.cost_per_unit` from the received unit cost.

The receipt audit row in `inv_adjustments` is intentionally typed as `purchase_receipt`. The stock-position view counts stock lots directly, so this audit row is not included as another positive stock movement.

## Approval And Status

Purchase orders use the shared status vocabulary:

- `draft`
- `pending`
- `ordered`
- `partial`
- `received`
- `cancelled`

Approval status uses:

- `pending`
- `approved`
- `rejected`
- `cancelled`

Approving a purchase order updates both the UI compatibility header and the canonical purchase header.

## Reporting Contract

`cost_purchase_receipts_v` exposes supplier, purchase, item, received quantity, unit cost, received cost, and stock-lot references for future cost reports.

## Follow-Up

Phase 05.06 should use the same cost-basis and stock-position model for waste and adjustment intelligence. Later cost-engine phases can decide whether to replace the compatibility purchase tables completely or keep them as the UI-facing adapter.
