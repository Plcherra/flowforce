-- Phase 03.05: audit activity trail contract.

drop function if exists public.log_audit_event(uuid, text, text, text, jsonb, jsonb);

create or replace function public.log_audit_event(
  target_user_id uuid default null,
  event_action text default null,
  target_table text default null,
  target_record_id text default null,
  previous_values jsonb default null,
  next_values jsonb default null,
  event_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
volatile
as $$
declare
  target_company_id uuid;
begin
  if event_action is null or target_table is null then
    return;
  end if;

  select p.company_id
  into target_company_id
  from public.profiles p
  where p.id = coalesce(auth.uid(), target_user_id)
  limit 1;

  if target_company_id is null and target_user_id is not null then
    select p.company_id
    into target_company_id
    from public.profiles p
    where p.id = target_user_id
    limit 1;
  end if;

  if target_company_id is null then
    select company_id
    into target_company_id
    from public.current_user_company_ids() company_id
    limit 1;
  end if;

  insert into public.audit_log (
    company_id,
    actor_id,
    target_user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    metadata
  )
  values (
    target_company_id,
    auth.uid(),
    target_user_id,
    event_action,
    target_table,
    target_record_id,
    previous_values,
    next_values,
    coalesce(event_metadata, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.log_audit_event(uuid, text, text, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.log_audit_event(uuid, text, text, text, jsonb, jsonb, jsonb) to authenticated, service_role;
