create or replace function public.assert_company_membership(p_company_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company_id uuid;
begin
  select company_id
    into v_company_id
    from public.profiles
    where id = auth.uid()
    limit 1;

  if v_company_id is null then
    raise exception
      using message = 'Profile not found for current user',
            detail = 'Cannot verify company membership without a profile record.';
  end if;

  if v_company_id <> p_company_id then
    raise exception
      using message = 'Access to requested company is denied',
            detail = format('User belongs to company %s but attempted to access %s', v_company_id, p_company_id);
  end if;

  return true;
end;
$$;

comment on function public.assert_company_membership(uuid)
is 'Ensures the authenticated user belongs to the provided company before returning scoped data.';

grant execute on function public.assert_company_membership(uuid) to anon;
grant execute on function public.assert_company_membership(uuid) to authenticated;
grant execute on function public.assert_company_membership(uuid) to service_role;
