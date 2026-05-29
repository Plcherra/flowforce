# 05.05 Purchasing And Supplier Flow

Date: 2026-05-28

## Completed

- Connected purchase-order creation to both `purchase_orders` and canonical `inv_purchases`.
- Connected purchase-order lines to both `purchase_order_items` and canonical `inv_purchase_lines`.
- Added receipt handling that creates `inv_stock_lots` for received quantity deltas.
- Added receipt audit rows with `adjustment_type = purchase_receipt` without double-counting stock position.
- Updated item cost basis from latest received supplier unit cost.
- Propagated approval/status changes into the canonical purchase header.
- Added the `cost_purchase_receipts_v` reporting view.
- Documented the purchasing/source-of-truth bridge in `docs/purchasing-supplier-flow.md`.

## Verification

- `npm run check:purchasing-flow`
- `npx eslint src/features/inventory/repositories/purchasingRepository.ts src/features/inventory/hooks/types.ts scripts/check-purchasing-flow-contract.mjs --max-warnings=0`
- `npm run typecheck`
- `npm run check:local`
- `npm run build`
- `git diff --check`
- `DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock supabase db reset`
- `DOCKER_HOST=unix:///Users/pedromartins/.colima/flowforce/docker.sock npm run test:db:security`

## Migration

Push this migration before testing remote purchasing receipts:

- `supabase/migrations/20260528000500_phase5_purchasing_supplier_flow_contract.sql`

## Next

Proceed to 05.06 Waste And Adjustment Intelligence.
