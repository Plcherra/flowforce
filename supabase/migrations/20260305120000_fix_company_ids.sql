begin;

-- Ensure departments table has company scoping
alter table public.departments
  add column if not exists company_id uuid references public.companies(id);

update public.departments
  set company_id = (
    select id from public.companies
    order by created_at asc
    limit 1
  )
  where company_id is null;

create index if not exists departments_company_idx
  on public.departments (company_id);

alter table public.departments enable row level security;

drop policy if exists "departments_tenant_all" on public.departments;
create policy "departments_tenant_all" on public.departments
  for all
  using (public.viewer_in_company(company_id))
  with check (public.viewer_in_company(company_id));

-- Ensure time off requests table has company scoping
alter table public.time_off_requests
  add column if not exists company_id uuid references public.companies(id);

update public.time_off_requests
  set company_id = (
    select id from public.companies
    order by created_at asc
    limit 1
  )
  where company_id is null;

create index if not exists time_off_requests_company_idx
  on public.time_off_requests (company_id);

alter table public.time_off_requests enable row level security;

drop policy if exists "time_off_requests_tenant_all" on public.time_off_requests;
create policy "time_off_requests_tenant_all" on public.time_off_requests
  for all
  using (public.viewer_in_company(company_id))
  with check (public.viewer_in_company(company_id));

-- Optional supporting tables
alter table if exists public.hr_performance_reviews
  add column if not exists company_id uuid references public.companies(id);

update public.hr_performance_reviews
  set company_id = (
    select id from public.companies
    order by created_at asc
    limit 1
  )
  where company_id is null;

create index if not exists hr_performance_reviews_company_idx
  on public.hr_performance_reviews (company_id);

alter table if exists public.learning_enrollments
  add column if not exists company_id uuid references public.companies(id);

update public.learning_enrollments
  set company_id = (
    select id from public.companies
    order by created_at asc
    limit 1
  )
  where company_id is null;

create index if not exists learning_enrollments_company_idx
  on public.learning_enrollments (company_id);

commit;
