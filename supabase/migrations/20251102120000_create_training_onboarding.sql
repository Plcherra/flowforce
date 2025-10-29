-- Training modules and onboarding assignments to support recognition automation
-- Creates core tables for training catalog, employee assignments, and progress logs
-- Adds helper views to simplify recognition joins

create table if not exists public.training_modules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  title text not null,
  description text,
  category text,
  level text,
  duration_minutes integer,
  xp_reward integer default 0,
  is_mandatory boolean default false,
  created_by uuid not null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_assignments (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.training_modules(id) on delete cascade,
  employee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed', 'expired')),
  progress integer not null default 0 check (progress >= 0 and progress <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  due_date date,
  assigned_by uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz not null default now(),
  notes text,
  unique (module_id, employee_id)
);

create table if not exists public.training_progress_logs (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.training_assignments(id) on delete cascade,
  progress integer not null check (progress >= 0 and progress <= 100),
  status text not null check (status in ('not_started', 'in_progress', 'completed', 'expired')),
  recorded_at timestamptz not null default now(),
  recorded_by uuid references public.profiles(id) on delete set null,
  notes text
);

-- Helpful view to simplify recognition joins
create or replace view public.v_training_completion_events as
  select
    ta.id as assignment_id,
    ta.completed_at,
    ta.employee_id,
    ta.module_id,
    tm.title as module_title,
    tm.xp_reward,
    tm.company_id
  from public.training_assignments ta
  join public.training_modules tm on tm.id = ta.module_id
  where ta.status = 'completed'
    and ta.completed_at is not null;

-- Enable RLS and add policies
alter table public.training_modules enable row level security;
alter table public.training_assignments enable row level security;
alter table public.training_progress_logs enable row level security;

create policy "Users can view training modules for their company" on public.training_modules
  for select using (company_id = get_user_company_id());

create policy "Admins and trainers manage training modules" on public.training_modules
  for all using (
    company_id = get_user_company_id()
    and (is_admin_or_manager(auth.uid()) or created_by = auth.uid())
  );

create policy "Users view their assignments" on public.training_assignments
  for select using (
    employee_id = auth.uid()
    or exists (
      select 1 from public.training_modules tm
      where tm.id = training_assignments.module_id
        and tm.company_id = get_user_company_id()
    )
  );

create policy "Admins assign training" on public.training_assignments
  for insert with check (
    exists (
      select 1 from public.training_modules tm
      where tm.id = training_assignments.module_id
        and tm.company_id = get_user_company_id()
    ) and is_admin_or_manager(auth.uid())
  );

create policy "Admins update training assignments" on public.training_assignments
  for update using (
    exists (
      select 1 from public.training_modules tm
      where tm.id = training_assignments.module_id
        and tm.company_id = get_user_company_id()
    ) and (is_admin_or_manager(auth.uid()) or assigned_by = auth.uid())
  );

create policy "Users log their own progress" on public.training_progress_logs
  for insert with check (
    exists (
      select 1 from public.training_assignments ta
      where ta.id = training_progress_logs.assignment_id
        and (
          ta.employee_id = auth.uid()
          or is_admin_or_manager(auth.uid())
        )
    )
  );

create policy "Company users view progress logs" on public.training_progress_logs
  for select using (
    exists (
      select 1 from public.training_assignments ta
      join public.training_modules tm on tm.id = ta.module_id
      where ta.id = training_progress_logs.assignment_id
        and tm.company_id = get_user_company_id()
    )
  );

-- Indexes for faster lookups
create index if not exists idx_training_modules_company on public.training_modules(company_id);
create index if not exists idx_training_assignments_employee on public.training_assignments(employee_id);
create index if not exists idx_training_assignments_module on public.training_assignments(module_id);
create index if not exists idx_training_progress_assignment on public.training_progress_logs(assignment_id);
create index if not exists idx_training_assignments_completed on public.training_assignments(status, completed_at);

-- Trigger for updated_at column on modules
create or replace function public.set_current_timestamp_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_training_modules_updated_at on public.training_modules;
create trigger trg_training_modules_updated_at
  before update on public.training_modules
  for each row
  execute procedure public.set_current_timestamp_updated_at();
