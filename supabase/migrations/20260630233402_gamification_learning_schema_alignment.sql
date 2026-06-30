-- Align gamification leaderboard + learning center tables with app contracts.

-- Gamification leaderboard: app expects xp breakdown columns and upsert key.
alter table public.gamification_leaderboard add column if not exists departmentid uuid;
alter table public.gamification_leaderboard add column if not exists role text;
alter table public.gamification_leaderboard add column if not exists xp_total numeric;
alter table public.gamification_leaderboard add column if not exists xp_tasks numeric;
alter table public.gamification_leaderboard add column if not exists xp_goals numeric;
alter table public.gamification_leaderboard add column if not exists xp_recognitions numeric;
alter table public.gamification_leaderboard add column if not exists xp_training numeric;
alter table public.gamification_leaderboard add column if not exists badge_tier text;
alter table public.gamification_leaderboard add column if not exists badge_codes jsonb;
alter table public.gamification_leaderboard add column if not exists achievements jsonb;
alter table public.gamification_leaderboard add column if not exists insights jsonb;

update public.gamification_leaderboard
set xp_total = coalesce(xp_total, total_xp, 0)
where xp_total is null;

create unique index if not exists gamification_leaderboard_company_employee_period_idx
  on public.gamification_leaderboard (company_id, employee_id, period, period_start);

-- Learning modules (referenced by Learning Center catalog).
create table if not exists public.learning_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.learning_courses(id) on delete cascade,
  company_id uuid references public.companies(id) on delete cascade,
  title text not null,
  description text,
  content text,
  order_index integer not null default 1,
  estimated_minutes numeric,
  xp_award numeric,
  created_at timestamptz not null default now()
);

create index if not exists learning_modules_course_id_idx
  on public.learning_modules (course_id);

create index if not exists learning_modules_company_id_idx
  on public.learning_modules (company_id);

-- Learning enrollments: extend legacy table to match app service.
alter table public.learning_enrollments add column if not exists course_id uuid references public.learning_courses(id) on delete cascade;
alter table public.learning_enrollments add column if not exists status text default 'in_progress';
alter table public.learning_enrollments add column if not exists progress_percent numeric default 0;
alter table public.learning_enrollments add column if not exists hours_completed numeric default 0;
alter table public.learning_enrollments add column if not exists current_module integer default 0;
alter table public.learning_enrollments add column if not exists level integer default 1;
alter table public.learning_enrollments add column if not exists started_at timestamptz default now();
alter table public.learning_enrollments add column if not exists completed_at timestamptz;
alter table public.learning_enrollments add column if not exists last_activity_at timestamptz default now();

create unique index if not exists learning_enrollments_course_employee_idx
  on public.learning_enrollments (course_id, employee_id)
  where course_id is not null and employee_id is not null;

-- Learning progress events: extend legacy table.
alter table public.learning_progress_events add column if not exists enrollment_id uuid references public.learning_enrollments(id) on delete cascade;
alter table public.learning_progress_events add column if not exists module_id uuid references public.learning_modules(id) on delete set null;
alter table public.learning_progress_events add column if not exists event_type text default 'note';
alter table public.learning_progress_events add column if not exists delta_progress numeric default 0;
alter table public.learning_progress_events add column if not exists delta_hours numeric default 0;
alter table public.learning_progress_events add column if not exists note text;
alter table public.learning_progress_events add column if not exists created_by uuid references auth.users(id) on delete set null;

-- Learning progress snapshots (separate from legacy learning_progress rows).
alter table public.learning_progress add column if not exists company_id uuid references public.companies(id) on delete cascade;
alter table public.learning_progress add column if not exists enrollment_id uuid references public.learning_enrollments(id) on delete cascade;
alter table public.learning_progress add column if not exists module_id uuid references public.learning_modules(id) on delete set null;
alter table public.learning_progress add column if not exists progress_percent numeric default 0;
alter table public.learning_progress add column if not exists time_spent_minutes numeric default 0;
alter table public.learning_progress add column if not exists quiz_score numeric;
alter table public.learning_progress add column if not exists ai_recommendation text;
alter table public.learning_progress add column if not exists recorded_at timestamptz default now();
alter table public.learning_progress add column if not exists recorded_by uuid references auth.users(id) on delete set null;
alter table public.learning_progress add column if not exists metadata jsonb;

create or replace view public.learning_course_metrics
with (security_invoker = true)
as
select
  c.id as course_id,
  c.title,
  c.category,
  c.company_id,
  c.xp_reward,
  c.estimated_hours,
  count(e.id) filter (where coalesce(e.status, 'in_progress') <> 'completed')::integer as active_learners,
  count(e.id) filter (where e.status = 'completed')::integer as completions,
  avg(e.progress_percent) as avg_progress,
  sum(coalesce(e.hours_completed, 0)) as total_hours_completed,
  sum(
    case when e.status = 'completed' then coalesce(c.xp_reward, 0) else 0 end
  ) as total_xp_awarded
from public.learning_courses c
left join public.learning_enrollments e on e.course_id = c.id
group by c.id, c.title, c.category, c.company_id, c.xp_reward, c.estimated_hours;

grant select on public.learning_course_metrics to authenticated;
grant select, insert, update, delete on public.learning_modules to authenticated;

alter table public.learning_modules enable row level security;

drop policy if exists "Company members can manage learning modules" on public.learning_modules;
create policy "Company members can manage learning modules"
on public.learning_modules
for all
to authenticated
using (company_id in (select public.current_user_company_ids()))
with check (company_id in (select public.current_user_company_ids()));

notify pgrst, 'reload schema';
