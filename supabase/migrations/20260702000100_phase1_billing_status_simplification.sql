-- Phase 1: simplify tenant billing status to trial | active | deactivated.
-- Back up system_settings before applying in production:
--   pg_dump ... --table=system_settings > system_settings_backup.sql

create or replace function public.map_legacy_billing_status(raw_status text)
returns text
language sql
immutable
as $$
  select case
    when lower(coalesce(raw_status, '')) in ('trial', 'trialing') then 'trial'
    when lower(coalesce(raw_status, '')) = 'active' then 'active'
    when lower(coalesce(raw_status, '')) in ('trial', 'active', 'deactivated')
      then lower(raw_status)
    else 'deactivated'
  end;
$$;

update public.system_settings ss
set admin_config = jsonb_set(
  ss.admin_config,
  '{tenantManagement}',
  (
    coalesce(ss.admin_config->'tenantManagement', '{}'::jsonb)
    - 'accountStatus'
    - 'subscriptionStatus'
  ) || jsonb_build_object(
    'billingStatus',
    public.map_legacy_billing_status(
      coalesce(
        ss.admin_config->'tenantManagement'->>'billingStatus',
        ss.admin_config->'tenantManagement'->>'accountStatus',
        ss.admin_config->'tenantManagement'->>'subscriptionStatus'
      )
    )
  ),
  true
)
where ss.admin_config is not null;

drop function public.map_legacy_billing_status(text);

notify pgrst, 'reload schema';
