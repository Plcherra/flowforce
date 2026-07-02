-- Post-migration verification for Phase 1 billing status simplification.
-- Run in Supabase SQL Editor after `supabase db push`.

select
  ss.company_id,
  c.name as company_name,
  ss.admin_config -> 'tenantManagement' ->> 'billingStatus' as billing_status,
  ss.admin_config -> 'tenantManagement' ->> 'accountStatus' as legacy_account_status,
  ss.admin_config -> 'tenantManagement' ->> 'subscriptionStatus' as legacy_subscription_status,
  ss.admin_config -> 'tenantManagement' ->> 'trialEndsAt' as trial_ends_at,
  ss.updated_at
from public.system_settings ss
left join public.companies c on c.id = ss.company_id
order by ss.updated_at desc;

-- Expect:
--   billing_status in ('trial', 'active', 'deactivated')
--   legacy_account_status and legacy_subscription_status are null

select
  count(*) filter (
    where admin_config -> 'tenantManagement' ->> 'billingStatus' is null
  ) as missing_billing_status,
  count(*) filter (
    where admin_config -> 'tenantManagement' ? 'accountStatus'
  ) as rows_with_legacy_account_status,
  count(*) filter (
    where admin_config -> 'tenantManagement' ? 'subscriptionStatus'
  ) as rows_with_legacy_subscription_status
from public.system_settings;
