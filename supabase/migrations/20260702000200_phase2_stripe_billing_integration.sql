-- Phase 2: Stripe billing integration columns and webhook idempotency.

alter table public.companies
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists current_period_ends_at timestamptz,
  add column if not exists cancel_at timestamptz;

create unique index if not exists companies_stripe_customer_id_uidx
  on public.companies (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists companies_stripe_subscription_id_idx
  on public.companies (stripe_subscription_id)
  where stripe_subscription_id is not null;

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  company_id uuid references public.companies(id) on delete set null,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_webhook_events_company_id_idx
  on public.stripe_webhook_events (company_id)
  where company_id is not null;

alter table public.stripe_webhook_events enable row level security;

-- Service role only; webhooks are processed server-side.
revoke all on public.stripe_webhook_events from anon, authenticated;
grant select, insert on public.stripe_webhook_events to service_role;

-- Backfill company billing dates from tenantManagement JSON when present.
update public.companies c
set
  trial_ends_at = coalesce(
    c.trial_ends_at,
    nullif(ss.admin_config->'tenantManagement'->>'trialEndsAt', '')::timestamptz
  ),
  current_period_ends_at = coalesce(
    c.current_period_ends_at,
    nullif(ss.admin_config->'tenantManagement'->>'currentPeriodEndsAt', '')::timestamptz
  )
from public.system_settings ss
where ss.company_id = c.id
  and ss.admin_config is not null;

notify pgrst, 'reload schema';
