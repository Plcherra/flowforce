-- Phase 05.10: cost engine signoff grants.
-- Regression coverage exposed that composed cost summaries could be selected
-- only until an authenticated user hit an underlying invoker view without
-- explicit SELECT privileges.

grant select on public.inv_stock_positions to authenticated;
grant select on public.cost_purchase_receipts_v to authenticated;
grant select on public.cost_waste_events_v to authenticated;
grant select on public.cost_waste_daily_v to authenticated;

notify pgrst, 'reload schema';
