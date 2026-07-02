-- Availability workflow domain columns + RLS (Phase 0)

alter table public.availability_request add column if not exists employee_id uuid;
alter table public.availability_request add column if not exists week_start date;
alter table public.availability_request add column if not exists payload jsonb default '{}'::jsonb;
alter table public.availability_request add column if not exists status text default 'pending';
alter table public.availability_request add column if not exists manager_id uuid;
alter table public.availability_request add column if not exists decision_note text;

alter table public.availability_exception add column if not exists employee_id uuid;
alter table public.availability_exception add column if not exists start_date date;
alter table public.availability_exception add column if not exists end_date date;
alter table public.availability_exception add column if not exists reason text;
alter table public.availability_exception add column if not exists approved_by uuid;

update public.availability_request request
set company_id = p.company_id
from public.profiles p
where request.company_id is null
  and request.employee_id = p.id
  and p.company_id is not null;

update public.availability_exception exception
set company_id = p.company_id
from public.profiles p
where exception.company_id is null
  and exception.employee_id = p.id
  and p.company_id is not null;

create index if not exists availability_request_company_week_status_idx
  on public.availability_request (company_id, week_start, status);

create index if not exists availability_exception_company_dates_idx
  on public.availability_exception (company_id, start_date, end_date);

create or replace function public.set_availability_request_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.employee_id is not null then
    select p.company_id
    into new.company_id
    from public.profiles p
    where p.id = new.employee_id
    limit 1;
  end if;
  return new;
end;
$$;

create or replace function public.set_availability_exception_company_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.company_id is null and new.employee_id is not null then
    select p.company_id
    into new.company_id
    from public.profiles p
    where p.id = new.employee_id
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists set_availability_request_company_id on public.availability_request;
create trigger set_availability_request_company_id
before insert or update on public.availability_request
for each row execute function public.set_availability_request_company_id();

drop trigger if exists set_availability_exception_company_id on public.availability_exception;
create trigger set_availability_exception_company_id
before insert or update on public.availability_exception
for each row execute function public.set_availability_exception_company_id();

grant select, insert, update, delete on public.availability_request to authenticated;
grant select, insert, update, delete on public.availability_exception to authenticated;

alter table public.availability_request enable row level security;
alter table public.availability_exception enable row level security;

drop policy if exists "Company members can manage availability requests" on public.availability_request;
create policy "Company members can manage availability requests"
on public.availability_request
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    employee_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = availability_request.employee_id
        and p.company_id = availability_request.company_id
    )
  )
);

drop policy if exists "Company members can manage availability exceptions" on public.availability_exception;
create policy "Company members can manage availability exceptions"
on public.availability_exception
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (
  company_id in (select public.current_user_company_ids())
  and (
    employee_id is null
    or exists (
      select 1
      from public.profiles p
      where p.id = availability_exception.employee_id
        and p.company_id = availability_exception.company_id
    )
  )
);

notify pgrst, 'reload schema';
