-- Last sign-in for the directory, and a backstop so a required hiring
-- block keeps onboarding open even if the finish button is bypassed.
-- Leaders who manage people can read those hire activity rows.

alter table public.profiles
  add column if not exists last_sign_in_at timestamptz;

create or replace function public.guard_onboarding_completion()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if new.status is distinct from 'complete' or old.status = 'complete' then
    return new;
  end if;
  if exists (
    select 1
    from public.hiring_blocks as block
    where block.company_id = new.company_id
      and block.archived_at is null
      and block.required is true
      and block.kind <> 'share_file'
      and not exists (
        select 1
        from public.hiring_responses as response
        where response.block_id = block.id
          and response.profile_id = new.profile_id
          and response.company_id = new.company_id
          and response.status in ('done', 'verified')
      )
  ) then
    raise exception 'required hiring block is incomplete' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_onboarding_completion on public.employee_onboarding_enrollments;
create trigger guard_onboarding_completion
before update on public.employee_onboarding_enrollments
for each row execute function public.guard_onboarding_completion();

revoke all on function public.guard_onboarding_completion() from public, anon, authenticated;

drop policy if exists "Inviters read company invites" on public.company_invites;
create policy "Inviters read company invites"
on public.company_invites
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
    company_id,
    array['manageUsers', 'systemSettings']
  )
);

drop policy if exists "Leaders read hire activity" on public.audit_log;
create policy "Leaders read hire activity"
on public.audit_log
for select
to authenticated
using (
  company_id in (select public.current_user_company_ids())
  and public.current_user_has_any_permission(
    company_id,
    array['manageUsers', 'systemSettings', 'documents.manage']
  )
);
