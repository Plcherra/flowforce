-- Phase 03.01: confirm company_members as the tenant membership source.
-- profiles.company_id remains a current-company/default-company shortcut only.

create or replace function public.current_user_company_ids()
returns setof uuid
language sql
security definer
set search_path = public
stable
as $$
  select cm.company_id
  from public.company_members cm
  where cm.user_id = auth.uid()
    and cm.company_id is not null;
$$;

create or replace function public.current_user_is_company_admin(target_company_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.company_members cm
    where cm.user_id = auth.uid()
      and cm.company_id = target_company_id
      and cm.role in ('owner', 'administrator', 'admin', 'company_admin')
  );
$$;

revoke all on function public.current_user_company_ids() from public;
revoke all on function public.current_user_is_company_admin(uuid) from public;
grant execute on function public.current_user_company_ids() to authenticated, service_role;
grant execute on function public.current_user_is_company_admin(uuid) to authenticated, service_role;
