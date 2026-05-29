-- Phase 5.09: owner financial overview.
-- This phase separates accounting-grade actuals, imported records, pending
-- approvals, and estimated operational cost before owners see one P&L view.

alter table public.expenses
  add column if not exists data_source text not null default 'manual',
  add column if not exists source_system text,
  add column if not exists import_batch_id text,
  add column if not exists external_id text,
  add column if not exists exported_at timestamptz,
  add column if not exists export_metadata jsonb not null default '{}'::jsonb;

alter table public.payments
  add column if not exists data_source text not null default 'manual',
  add column if not exists source_system text,
  add column if not exists import_batch_id text,
  add column if not exists external_id text,
  add column if not exists exported_at timestamptz,
  add column if not exists export_metadata jsonb not null default '{}'::jsonb;

alter table public.expenses
  drop constraint if exists expenses_data_source_known,
  add constraint expenses_data_source_known
  check (lower(data_source) in ('manual', 'system', 'imported', 'estimated', 'sample'));

alter table public.payments
  drop constraint if exists payments_data_source_known,
  add constraint payments_data_source_known
  check (lower(data_source) in ('manual', 'system', 'imported', 'estimated', 'sample'));

create index if not exists expenses_company_source_date_idx
on public.expenses (company_id, lower(data_source), expense_date);

create index if not exists payments_company_source_paid_date_idx
on public.payments (company_id, lower(data_source), paid_date);

create index if not exists expenses_company_status_approval_idx
on public.expenses (company_id, lower(status), approved_at);

create index if not exists payments_company_status_approval_idx
on public.payments (company_id, lower(status), approved_at);

create or replace view public.owner_financial_daily_v
with (security_invoker = true)
as
with day_costs as (
  select
    summary.company_id,
    summary.summary_date,
    sum(coalesce(summary.labor_cost, 0))::numeric as estimated_labor_cost,
    sum(coalesce(summary.production_cost, 0))::numeric as estimated_production_cost,
    sum(coalesce(summary.waste_cost, 0))::numeric as estimated_waste_cost,
    sum(coalesce(summary.purchasing_cost, 0))::numeric as estimated_purchasing_cost,
    sum(
      coalesce(summary.labor_cost, 0)
      + coalesce(summary.production_cost, 0)
      + coalesce(summary.waste_cost, 0)
      + coalesce(summary.purchasing_cost, 0)
    )::numeric as estimated_operating_cost,
    sum(coalesce(summary.shortage_item_count, 0))::integer as shortage_item_count,
    sum(coalesce(summary.overstock_item_count, 0))::integer as overstock_item_count
  from public.cost_day_location_summary_v summary
  group by summary.company_id, summary.summary_date
),
revenue as (
  select
    transaction.company_id,
    transaction.created_at::date as summary_date,
    sum(coalesce(transaction.total_amount, 0))::numeric as actual_revenue,
    count(*)::integer as revenue_record_count
  from public.inventory_transactions transaction
  where transaction.transaction_type = 'sale'
    and coalesce(transaction.reference_number, '') not ilike 'DEMO-%'
    and coalesce(transaction.notes, '') not ilike '%demo%'
  group by transaction.company_id, transaction.created_at::date
),
expense_rollup as (
  select
    expense.company_id,
    coalesce(expense.expense_date, expense.created_at::date) as summary_date,
    sum(coalesce(expense.amount, 0)) filter (
      where coalesce(lower(expense.status), 'pending') in ('approved', 'paid')
        and lower(coalesce(expense.data_source, 'manual')) in ('manual', 'system')
        and coalesce(expense.description, '') not ilike 'Demo Financial%'
    )::numeric as actual_expenses,
    sum(coalesce(expense.amount, 0)) filter (
      where coalesce(lower(expense.status), 'pending') in ('approved', 'paid')
        and lower(coalesce(expense.data_source, 'manual')) = 'imported'
    )::numeric as imported_expenses,
    sum(coalesce(expense.amount, 0)) filter (
      where coalesce(lower(expense.status), 'pending') in ('approved', 'paid')
        and lower(coalesce(expense.data_source, 'manual')) = 'estimated'
    )::numeric as estimated_expenses,
    sum(coalesce(expense.amount, 0)) filter (
      where coalesce(lower(expense.status), 'pending') in ('pending', 'draft')
    )::numeric as pending_expense_total,
    count(*) filter (
      where coalesce(lower(expense.status), 'pending') in ('pending', 'draft')
    )::integer as pending_expense_count,
    count(*)::integer as expense_record_count
  from public.expenses expense
  where coalesce(lower(expense.status), 'pending') not in ('rejected', 'cancelled', 'canceled', 'void')
    and lower(coalesce(expense.data_source, 'manual')) <> 'sample'
  group by expense.company_id, coalesce(expense.expense_date, expense.created_at::date)
),
payment_rollup as (
  select
    payment.company_id,
    coalesce(payment.paid_date, payment.due_date, payment.created_at::date) as summary_date,
    sum(coalesce(payment.amount, 0)) filter (
      where coalesce(lower(payment.status), 'pending') in ('approved', 'paid')
        and lower(coalesce(payment.data_source, 'manual')) in ('manual', 'system')
        and coalesce(payment.description, '') not ilike 'Demo Financial%'
    )::numeric as actual_payments,
    sum(coalesce(payment.amount, 0)) filter (
      where coalesce(lower(payment.status), 'pending') in ('approved', 'paid')
        and lower(coalesce(payment.data_source, 'manual')) = 'imported'
    )::numeric as imported_payments,
    sum(coalesce(payment.amount, 0)) filter (
      where coalesce(lower(payment.status), 'pending') in ('approved', 'paid')
        and lower(coalesce(payment.data_source, 'manual')) = 'estimated'
    )::numeric as estimated_payments,
    sum(coalesce(payment.amount, 0)) filter (
      where coalesce(lower(payment.status), 'pending') in ('pending', 'draft')
    )::numeric as pending_payment_total,
    count(*) filter (
      where coalesce(lower(payment.status), 'pending') in ('pending', 'draft')
    )::integer as pending_payment_count,
    count(*)::integer as payment_record_count
  from public.payments payment
  where coalesce(lower(payment.status), 'pending') not in ('rejected', 'cancelled', 'canceled', 'void')
    and lower(coalesce(payment.data_source, 'manual')) <> 'sample'
  group by payment.company_id, coalesce(payment.paid_date, payment.due_date, payment.created_at::date)
),
keys as (
  select company_id, summary_date from day_costs
  union
  select company_id, summary_date from revenue
  union
  select company_id, summary_date from expense_rollup
  union
  select company_id, summary_date from payment_rollup
)
select
  keys.company_id,
  keys.summary_date,
  coalesce(revenue.actual_revenue, 0)::numeric as actual_revenue,
  coalesce(expense_rollup.actual_expenses, 0)::numeric as actual_expenses,
  coalesce(payment_rollup.actual_payments, 0)::numeric as actual_payments,
  (
    coalesce(expense_rollup.imported_expenses, 0)
    + coalesce(payment_rollup.imported_payments, 0)
  )::numeric as imported_cost,
  (
    coalesce(day_costs.estimated_operating_cost, 0)
    + coalesce(expense_rollup.estimated_expenses, 0)
    + coalesce(payment_rollup.estimated_payments, 0)
  )::numeric as estimated_cost,
  coalesce(day_costs.estimated_labor_cost, 0)::numeric as estimated_labor_cost,
  coalesce(day_costs.estimated_production_cost, 0)::numeric as estimated_production_cost,
  coalesce(day_costs.estimated_waste_cost, 0)::numeric as estimated_waste_cost,
  coalesce(day_costs.estimated_purchasing_cost, 0)::numeric as estimated_purchasing_cost,
  coalesce(expense_rollup.pending_expense_total, 0)::numeric as pending_expense_total,
  coalesce(expense_rollup.pending_expense_count, 0)::integer as pending_expense_count,
  coalesce(payment_rollup.pending_payment_total, 0)::numeric as pending_payment_total,
  coalesce(payment_rollup.pending_payment_count, 0)::integer as pending_payment_count,
  coalesce(revenue.revenue_record_count, 0)::integer as revenue_record_count,
  coalesce(expense_rollup.expense_record_count, 0)::integer as expense_record_count,
  coalesce(payment_rollup.payment_record_count, 0)::integer as payment_record_count,
  coalesce(day_costs.shortage_item_count, 0)::integer as shortage_item_count,
  coalesce(day_costs.overstock_item_count, 0)::integer as overstock_item_count,
  (
    coalesce(revenue.actual_revenue, 0)
    - coalesce(expense_rollup.actual_expenses, 0)
    - coalesce(payment_rollup.actual_payments, 0)
    - coalesce(expense_rollup.imported_expenses, 0)
    - coalesce(payment_rollup.imported_payments, 0)
    - coalesce(day_costs.estimated_operating_cost, 0)
    - coalesce(expense_rollup.estimated_expenses, 0)
    - coalesce(payment_rollup.estimated_payments, 0)
  )::numeric as net_operating_position,
  jsonb_strip_nulls(
    jsonb_build_object(
      'has_estimates', case when coalesce(day_costs.estimated_operating_cost, 0) > 0 then true end,
      'has_imports', case
        when coalesce(expense_rollup.imported_expenses, 0) + coalesce(payment_rollup.imported_payments, 0) > 0
          then true
      end,
      'pending_approvals', case
        when coalesce(expense_rollup.pending_expense_count, 0) + coalesce(payment_rollup.pending_payment_count, 0) > 0
          then true
      end,
      'inventory_signal', case
        when coalesce(day_costs.shortage_item_count, 0) > 0 then 'shortage'
        when coalesce(day_costs.overstock_item_count, 0) > 0 then 'overstock'
      end
    )
  ) as data_quality_flags
from keys
left join day_costs
  on day_costs.company_id = keys.company_id
  and day_costs.summary_date = keys.summary_date
left join revenue
  on revenue.company_id = keys.company_id
  and revenue.summary_date = keys.summary_date
left join expense_rollup
  on expense_rollup.company_id = keys.company_id
  and expense_rollup.summary_date = keys.summary_date
left join payment_rollup
  on payment_rollup.company_id = keys.company_id
  and payment_rollup.summary_date = keys.summary_date
where keys.company_id is not null
  and keys.summary_date is not null;

grant select on public.owner_financial_daily_v to authenticated;

create or replace view public.owner_financial_export_v
with (security_invoker = true)
as
select
  daily.company_id,
  date_trunc('month', daily.summary_date)::date as period_start,
  (date_trunc('month', daily.summary_date) + interval '1 month - 1 day')::date as period_end,
  sum(daily.actual_revenue)::numeric as actual_revenue,
  sum(daily.actual_expenses)::numeric as actual_expenses,
  sum(daily.actual_payments)::numeric as actual_payments,
  sum(daily.imported_cost)::numeric as imported_cost,
  sum(daily.estimated_cost)::numeric as estimated_cost,
  sum(daily.pending_expense_total)::numeric as pending_expense_total,
  sum(daily.pending_payment_total)::numeric as pending_payment_total,
  sum(daily.net_operating_position)::numeric as net_operating_position,
  sum(daily.revenue_record_count)::integer as revenue_record_count,
  sum(daily.expense_record_count)::integer as expense_record_count,
  sum(daily.payment_record_count)::integer as payment_record_count,
  jsonb_strip_nulls(
    jsonb_build_object(
      'source_mix', jsonb_build_object(
        'actual', sum(daily.actual_expenses + daily.actual_payments),
        'imported', sum(daily.imported_cost),
        'estimated', sum(daily.estimated_cost)
      ),
      'pending_approvals', sum(daily.pending_expense_count + daily.pending_payment_count),
      'shortage_days', count(*) filter (where daily.shortage_item_count > 0)
    )
  ) as export_metadata
from public.owner_financial_daily_v daily
group by daily.company_id, date_trunc('month', daily.summary_date);

grant select on public.owner_financial_export_v to authenticated;

create or replace function public.get_owner_financial_overview(
  p_company_id uuid default null,
  p_start_date date default null,
  p_end_date date default null
)
returns table (
  company_id uuid,
  start_date date,
  end_date date,
  actual_revenue numeric,
  actual_expenses numeric,
  actual_payments numeric,
  imported_cost numeric,
  estimated_cost numeric,
  estimated_labor_cost numeric,
  estimated_production_cost numeric,
  estimated_waste_cost numeric,
  estimated_purchasing_cost numeric,
  pending_expense_total numeric,
  pending_expense_count integer,
  pending_payment_total numeric,
  pending_payment_count integer,
  net_operating_position numeric,
  export_row_count integer,
  source_breakdown jsonb,
  data_quality_flags jsonb
)
language sql
stable
security invoker
set search_path = public
as $$
  with scoped as (
    select *
    from public.owner_financial_daily_v daily
    where daily.company_id in (select public.current_user_company_ids())
      and (p_company_id is null or daily.company_id = p_company_id)
      and (p_start_date is null or daily.summary_date >= p_start_date)
      and (p_end_date is null or daily.summary_date <= p_end_date)
  )
  select
    coalesce(p_company_id, (select scoped.company_id from scoped limit 1)) as company_id,
    coalesce(p_start_date, min(scoped.summary_date)) as start_date,
    coalesce(p_end_date, max(scoped.summary_date)) as end_date,
    coalesce(sum(scoped.actual_revenue), 0)::numeric as actual_revenue,
    coalesce(sum(scoped.actual_expenses), 0)::numeric as actual_expenses,
    coalesce(sum(scoped.actual_payments), 0)::numeric as actual_payments,
    coalesce(sum(scoped.imported_cost), 0)::numeric as imported_cost,
    coalesce(sum(scoped.estimated_cost), 0)::numeric as estimated_cost,
    coalesce(sum(scoped.estimated_labor_cost), 0)::numeric as estimated_labor_cost,
    coalesce(sum(scoped.estimated_production_cost), 0)::numeric as estimated_production_cost,
    coalesce(sum(scoped.estimated_waste_cost), 0)::numeric as estimated_waste_cost,
    coalesce(sum(scoped.estimated_purchasing_cost), 0)::numeric as estimated_purchasing_cost,
    coalesce(sum(scoped.pending_expense_total), 0)::numeric as pending_expense_total,
    coalesce(sum(scoped.pending_expense_count), 0)::integer as pending_expense_count,
    coalesce(sum(scoped.pending_payment_total), 0)::numeric as pending_payment_total,
    coalesce(sum(scoped.pending_payment_count), 0)::integer as pending_payment_count,
    coalesce(sum(scoped.net_operating_position), 0)::numeric as net_operating_position,
    coalesce(count(*), 0)::integer as export_row_count,
    jsonb_build_object(
      'actual', coalesce(sum(scoped.actual_expenses + scoped.actual_payments), 0),
      'imported', coalesce(sum(scoped.imported_cost), 0),
      'estimated', coalesce(sum(scoped.estimated_cost), 0),
      'revenue', coalesce(sum(scoped.actual_revenue), 0),
      'pending', coalesce(sum(scoped.pending_expense_total + scoped.pending_payment_total), 0)
    ) as source_breakdown,
    jsonb_strip_nulls(
      jsonb_build_object(
        'has_estimates', case when coalesce(sum(scoped.estimated_cost), 0) > 0 then true end,
        'has_imports', case when coalesce(sum(scoped.imported_cost), 0) > 0 then true end,
        'pending_approvals', case
          when coalesce(sum(scoped.pending_expense_count + scoped.pending_payment_count), 0) > 0 then true
        end,
        'shortage_days', nullif(count(*) filter (where scoped.shortage_item_count > 0), 0),
        'export_rows', nullif(count(*), 0)
      )
    ) as data_quality_flags
  from scoped;
$$;

grant execute on function public.get_owner_financial_overview(uuid, date, date) to authenticated;

create or replace function public.get_owner_financial_export(
  p_company_id uuid default null,
  p_start_date date default null,
  p_end_date date default null
)
returns setof public.owner_financial_export_v
language sql
stable
security invoker
set search_path = public
as $$
  select *
  from public.owner_financial_export_v export_rows
  where export_rows.company_id in (select public.current_user_company_ids())
    and (p_company_id is null or export_rows.company_id = p_company_id)
    and (p_start_date is null or export_rows.period_end >= p_start_date)
    and (p_end_date is null or export_rows.period_start <= p_end_date)
  order by export_rows.period_start desc;
$$;

grant execute on function public.get_owner_financial_export(uuid, date, date) to authenticated;

notify pgrst, 'reload schema';
