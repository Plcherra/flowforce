set search_path = public;

create table if not exists public.kpi_insights (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  metric text not null,
  label text,
  value numeric,
  delta numeric,
  trend text check (trend in ('up', 'down', 'flat')),
  signal text,
  impact text,
  unit text,
  metadata jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default timezone('utc', now())
);

create index if not exists kpi_insights_company_recorded_idx
  on public.kpi_insights (company_id, recorded_at desc);

create index if not exists kpi_insights_company_metric_idx
  on public.kpi_insights (company_id, metric, recorded_at desc);

alter table public.kpi_insights
  enable row level security;

drop policy if exists "kpi_insights_company_scope" on public.kpi_insights;

create policy "kpi_insights_company_scope"
  on public.kpi_insights
  using ((company_id)::text = current_setting('request.jwt.claims.company_id', true))
  with check ((company_id)::text = current_setting('request.jwt.claims.company_id', true));

create or replace function public.get_kpi_summary(
  company_id uuid,
  range_start timestamptz default timezone('utc', now() - interval '7 days'),
  range_end timestamptz default timezone('utc', now())
)
returns table (
  id uuid,
  label text,
  metric text,
  value numeric,
  delta numeric,
  trend text,
  unit text
)
language sql
as $$
  with bounds as (
    select
      coalesce(range_start, timezone('utc', now() - interval '7 days')) as start_at,
      greatest(
        coalesce(range_end, timezone('utc', now())),
        coalesce(range_start, timezone('utc', now() - interval '7 days')) + interval '1 day'
      ) as end_at
  ),
  ranked as (
    select distinct on (ins.metric)
      ins.id,
      coalesce(ins.label, ins.metric) as label,
      ins.metric,
      coalesce(ins.value, 0) as value,
      coalesce(ins.delta, 0) as delta,
      case
        when ins.trend is null and coalesce(ins.delta, 0) > 0 then 'up'
        when ins.trend is null and coalesce(ins.delta, 0) < 0 then 'down'
        when ins.trend is null then 'flat'
        else ins.trend
      end as trend,
      ins.unit
    from public.kpi_insights ins
    cross join bounds
    where ins.company_id = get_kpi_summary.company_id
      and ins.recorded_at >= bounds.start_at
      and ins.recorded_at < bounds.end_at
    order by ins.metric, ins.recorded_at desc
  )
  select * from ranked;
$$;

create or replace function public.get_ai_kpi_insights(
  company_id uuid,
  range_start timestamptz default timezone('utc', now() - interval '14 days'),
  range_end timestamptz default timezone('utc', now())
)
returns table (
  metric text,
  change numeric,
  signal text,
  impact text
)
language sql
as $$
  with bounds as (
    select
      coalesce(range_start, timezone('utc', now() - interval '14 days')) as start_at,
      greatest(
        coalesce(range_end, timezone('utc', now())),
        coalesce(range_start, timezone('utc', now() - interval '14 days')) + interval '1 day'
      ) as end_at
  ),
  ordered as (
    select
      coalesce(ins.label, ins.metric) as metric,
      coalesce(ins.delta, ins.value, 0) as change,
      coalesce(ins.signal, ins.trend, 'flat') as signal,
      coalesce(
        ins.impact,
        case
          when coalesce(ins.delta, 0) > 0 then 'Positive movement'
          when coalesce(ins.delta, 0) < 0 then 'Negative movement'
          else 'Stable trend'
        end
      ) as impact,
      ins.recorded_at
    from public.kpi_insights ins
    cross join bounds
    where ins.company_id = get_ai_kpi_insights.company_id
      and ins.recorded_at >= bounds.start_at
      and ins.recorded_at < bounds.end_at
    order by ins.recorded_at desc
  )
  select metric, change, signal, impact
  from ordered
  limit 12;
$$;
