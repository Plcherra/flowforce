-- Phase 05.05: purchasing and supplier flow contract.
-- Purchase receipts are bridged into the canonical inv_* cost engine. Received
-- supplier goods create stock lots; receipt audit adjustments use a distinct
-- purchase_receipt type so inv_stock_positions does not double count them.

alter table public.purchase_orders
  add column if not exists company_id uuid,
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approved_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table public.purchase_order_items
  add column if not exists company_id uuid,
  add column if not exists received_at timestamptz,
  add column if not exists stock_lot_id uuid;

alter table public.inv_purchases
  add column if not exists legacy_purchase_order_id uuid,
  add column if not exists approval_status text not null default 'pending',
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists currency text not null default 'USD',
  add column if not exists supplier_snapshot jsonb not null default '{}'::jsonb;

alter table public.inv_purchase_lines
  add column if not exists legacy_purchase_order_item_id uuid,
  add column if not exists location_id uuid,
  add column if not exists status text not null default 'ordered',
  add column if not exists received_at timestamptz,
  add column if not exists stock_lot_id uuid;

alter table public.inv_stock_lots
  add column if not exists purchase_id uuid,
  add column if not exists purchase_line_id uuid;

do $$
begin
  alter table public.purchase_orders
    add constraint purchase_orders_status_known
    check (status is null or status in ('draft', 'pending', 'ordered', 'partial', 'received', 'cancelled')) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.purchase_orders
    add constraint purchase_orders_approval_status_known
    check (approval_status in ('pending', 'approved', 'rejected', 'cancelled')) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.purchase_order_items
    add constraint purchase_order_items_quantity_nonnegative
    check (
      (quantity is null or quantity >= 0)
      and (received_quantity is null or received_quantity >= 0)
      and (unit_price is null or unit_price >= 0)
      and (total_price is null or total_price >= 0)
    ) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_purchases
    add constraint inv_purchases_status_known
    check (status is null or status in ('draft', 'pending', 'ordered', 'partial', 'received', 'cancelled')) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_purchases
    add constraint inv_purchases_approval_status_known
    check (approval_status in ('pending', 'approved', 'rejected', 'cancelled')) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_purchase_lines
    add constraint inv_purchase_lines_receipt_quantities_nonnegative
    check (
      (quantity_ordered is null or quantity_ordered >= 0)
      and (quantity_received is null or quantity_received >= 0)
      and (unit_cost is null or unit_cost >= 0)
      and (line_total is null or line_total >= 0)
    ) not valid;
exception when duplicate_object then null;
end
$$;

do $$
begin
  alter table public.inv_purchase_lines
    add constraint inv_purchase_lines_status_known
    check (status in ('ordered', 'partial', 'received', 'cancelled')) not valid;
exception when duplicate_object then null;
end
$$;

create unique index if not exists inv_purchases_legacy_purchase_order_id_key
  on public.inv_purchases (legacy_purchase_order_id)
  where legacy_purchase_order_id is not null;

create unique index if not exists inv_purchase_lines_legacy_purchase_order_item_id_key
  on public.inv_purchase_lines (legacy_purchase_order_item_id)
  where legacy_purchase_order_item_id is not null;

create index if not exists inv_purchases_company_status_expected_idx
  on public.inv_purchases (company_id, status, expected_date);

create index if not exists inv_purchase_lines_purchase_item_idx
  on public.inv_purchase_lines (purchase_id, item_id);

create index if not exists inv_stock_lots_purchase_line_idx
  on public.inv_stock_lots (purchase_id, purchase_line_id);

create index if not exists inv_adjustments_purchase_receipt_idx
  on public.inv_adjustments (company_id, reference_number)
  where adjustment_type = 'purchase_receipt';

create or replace view public.cost_purchase_receipts_v
with (security_invoker = true) as
select
  purchase.company_id,
  purchase.id as purchase_id,
  purchase.legacy_purchase_order_id,
  purchase.po_number,
  purchase.status,
  purchase.approval_status,
  purchase.supplier_id,
  supplier.name as supplier_name,
  line.id as purchase_line_id,
  line.legacy_purchase_order_item_id,
  line.item_id,
  item.name as item_name,
  line.location_id,
  line.quantity_ordered,
  coalesce(line.quantity_received, 0)::numeric as quantity_received,
  line.unit_cost,
  (coalesce(line.quantity_received, 0) * coalesce(line.unit_cost, 0))::numeric as received_cost,
  line.line_total,
  line.received_date,
  line.stock_lot_id,
  purchase.order_date,
  purchase.expected_date,
  purchase.received_date as purchase_received_date
from public.inv_purchases purchase
left join public.inv_purchase_lines line on line.purchase_id = purchase.id
left join public.inv_suppliers supplier on supplier.id = purchase.supplier_id
left join public.inv_items item on item.id = line.item_id;

notify pgrst, 'reload schema';
