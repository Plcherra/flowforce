BEGIN;

-- Ensure learning tables carry company scope ---------------------------------
ALTER TABLE public.learning_courses
  ADD COLUMN IF NOT EXISTS company_id uuid;

ALTER TABLE public.learning_modules
  ADD COLUMN IF NOT EXISTS company_id uuid;

ALTER TABLE public.learning_enrollments
  ADD COLUMN IF NOT EXISTS company_id uuid;

ALTER TABLE public.goal_rewards
  ADD COLUMN IF NOT EXISTS company_id uuid;

-- Backfill company identifiers using existing relationships -------------------
UPDATE public.learning_courses lc
SET company_id = p.company_id
FROM public.profiles p
WHERE lc.company_id IS NULL
  AND lc.created_by = p.id;

UPDATE public.learning_modules lm
SET company_id = c.company_id
FROM public.learning_courses c
WHERE lm.company_id IS NULL
  AND lm.course_id = c.id;

UPDATE public.learning_enrollments le
SET company_id = c.company_id
FROM public.learning_courses c
WHERE le.company_id IS NULL
  AND le.course_id = c.id;

UPDATE public.goal_rewards gr
SET company_id = g.company_id
FROM public.goals g
WHERE gr.company_id IS NULL
  AND gr.goal_id = g.id;

UPDATE public.goal_rewards gr
SET company_id = (reward_details->'metadata'->>'company_id')::uuid
WHERE gr.company_id IS NULL
  AND reward_details ? 'metadata'
  AND (reward_details->'metadata'->>'company_id') ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';

UPDATE public.goal_rewards gr
SET company_id = p.company_id
FROM public.profiles p
WHERE gr.company_id IS NULL
  AND gr.created_by = p.id;

-- Harden referential integrity ------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'learning_courses_company_fk'
  ) THEN
    ALTER TABLE public.learning_courses
      ADD CONSTRAINT learning_courses_company_fk
      FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'learning_modules_company_fk'
  ) THEN
    ALTER TABLE public.learning_modules
      ADD CONSTRAINT learning_modules_company_fk
      FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'learning_enrollments_company_fk'
  ) THEN
    ALTER TABLE public.learning_enrollments
      ADD CONSTRAINT learning_enrollments_company_fk
      FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goal_rewards_company_fk'
  ) THEN
    ALTER TABLE public.goal_rewards
      ADD CONSTRAINT goal_rewards_company_fk
      FOREIGN KEY (company_id) REFERENCES public.companies (id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.learning_courses ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.learning_modules ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.learning_enrollments ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE public.goal_rewards ALTER COLUMN company_id SET NOT NULL;

-- Performance indexes --------------------------------------------------------
CREATE INDEX IF NOT EXISTS learning_courses_company_idx
  ON public.learning_courses (company_id, id);

CREATE INDEX IF NOT EXISTS learning_modules_company_idx
  ON public.learning_modules (company_id, id);

CREATE INDEX IF NOT EXISTS learning_enrollments_company_employee_idx
  ON public.learning_enrollments (company_id, employee_id);

CREATE INDEX IF NOT EXISTS goal_rewards_company_employee_idx
  ON public.goal_rewards (company_id, user_id);

-- Refresh metrics view with company join -------------------------------------
CREATE OR REPLACE VIEW public.learning_course_metrics AS
SELECT
  c.id AS course_id,
  c.title,
  c.category,
  c.company_id,
  c.xp_reward,
  c.estimated_hours,
  COUNT(e.*) FILTER (WHERE e.status IN ('completed', 'in_progress')) AS active_learners,
  COUNT(e.*) FILTER (WHERE e.status = 'completed') AS completions,
  AVG(e.progress_percent) FILTER (WHERE e.status != 'withdrawn') AS avg_progress,
  SUM(e.hours_completed) AS total_hours_completed,
  SUM(CASE WHEN e.status = 'completed' THEN c.xp_reward ELSE 0 END) AS total_xp_awarded
FROM public.learning_courses c
LEFT JOIN public.learning_enrollments e
  ON e.course_id = c.id
 AND e.company_id = c.company_id
GROUP BY c.id, c.title, c.category, c.company_id, c.xp_reward, c.estimated_hours;

ALTER VIEW public.learning_course_metrics SET (security_invoker = true);

-- Tighten learning course/module policies ------------------------------------
DROP POLICY IF EXISTS "Learning courses are visible to authenticated users" ON public.learning_courses;
CREATE POLICY "Learning courses scoped to company"
  ON public.learning_courses FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Learning courses can be managed by training admins" ON public.learning_courses;
CREATE POLICY "Training admins manage company courses"
  ON public.learning_courses FOR ALL
  USING (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Learning modules are visible to authenticated users" ON public.learning_modules;
CREATE POLICY "Learning modules scoped to company"
  ON public.learning_modules FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Learning modules managed by training admins" ON public.learning_modules;
CREATE POLICY "Training admins manage company modules"
  ON public.learning_modules FOR ALL
  USING (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  );

-- Tighten enrollment access ---------------------------------------------------
DROP POLICY IF EXISTS "Employees can view their learning enrollments" ON public.learning_enrollments;
CREATE POLICY "Company members view enrollments"
  ON public.learning_enrollments FOR SELECT
  USING (
    company_id = public.get_user_company_id()
    AND (
      employee_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('supervisor', 'manager', 'admin', 'company_admin', 'owner')
      )
    )
  );

DROP POLICY IF EXISTS "Employees can enroll themselves in courses" ON public.learning_enrollments;
CREATE POLICY "Company members create enrollments"
  ON public.learning_enrollments FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND (
      employee_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('manager', 'admin', 'company_admin', 'owner')
      )
    )
  );

DROP POLICY IF EXISTS "Employees and admins can update enrollment progress" ON public.learning_enrollments;
CREATE POLICY "Company members update enrollments"
  ON public.learning_enrollments FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND (
      employee_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('supervisor', 'manager', 'admin', 'company_admin', 'owner')
      )
    )
  )
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND (
      employee_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('supervisor', 'manager', 'admin', 'company_admin', 'owner')
      )
    )
  );

DROP POLICY IF EXISTS "Training admins can delete enrollments" ON public.learning_enrollments;
CREATE POLICY "Admins delete company enrollments"
  ON public.learning_enrollments FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  );

DROP POLICY IF EXISTS "Progress events visible to related employees" ON public.learning_progress_events;
CREATE POLICY "Company members view progress events"
  ON public.learning_progress_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_enrollments le
      WHERE le.id = enrollment_id
        AND le.company_id = public.get_user_company_id()
        AND (
          le.employee_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('supervisor', 'manager', 'admin', 'company_admin', 'owner')
          )
        )
    )
  );

DROP POLICY IF EXISTS "Progress events can be created by enrollment owners or admins" ON public.learning_progress_events;
CREATE POLICY "Company members insert progress events"
  ON public.learning_progress_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_enrollments le
      WHERE le.id = enrollment_id
        AND le.company_id = public.get_user_company_id()
        AND (
          le.employee_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND role IN ('supervisor', 'manager', 'admin', 'company_admin', 'owner')
          )
        )
    )
  );

-- Roster cache to support background sync -----------------------------------
CREATE TABLE IF NOT EXISTS public.hr_roster_cache (
  company_id uuid PRIMARY KEY REFERENCES public.companies (id) ON DELETE CASCADE,
  snapshot jsonb NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.hr_roster_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members read roster cache" ON public.hr_roster_cache;
CREATE POLICY "Company members read roster cache"
  ON public.hr_roster_cache FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Admins manage roster cache" ON public.hr_roster_cache;
CREATE POLICY "Admins manage roster cache"
  ON public.hr_roster_cache FOR ALL
  USING (company_id = public.get_user_company_id() AND public.is_company_admin())
  WITH CHECK (company_id = public.get_user_company_id() AND public.is_company_admin());

-- Recognition RPC scoped to company ------------------------------------------
CREATE OR REPLACE FUNCTION public.get_recognitions(company uuid)
RETURNS SETOF public.goal_rewards
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.goal_rewards
  WHERE company_id = company
    AND reward_type = 'recognition';
$$;

GRANT EXECUTE ON FUNCTION public.get_recognitions(uuid) TO authenticated;

COMMIT;
-- Enforce tenant-aware row level security across core operations tables

begin;

-- Helper expression
drop function if exists public.current_company_id();
create or replace function public.current_company_id() returns text
  language sql
  stable
as $$
  select nullif(current_setting('request.jwt.claims.company_id', true), '')
$$;

-- Profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self" on public.profiles
  for select
  using (
    auth.uid() = id
    and coalesce(company_id::text, '') = coalesce(public.current_company_id(), '')
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update
  using (
    auth.uid() = id
    and coalesce(company_id::text, '') = coalesce(public.current_company_id(), '')
  )
  with check (
    auth.uid() = id
    and coalesce(company_id::text, '') = coalesce(public.current_company_id(), '')
  );

-- Shared predicate helper
drop function if exists public.viewer_in_company(uuid);
create or replace function public.viewer_in_company(target_company uuid) returns boolean
  language sql
  stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.company_id = target_company
      and coalesce(p.company_id::text, '') = coalesce(public.current_company_id(), '')
  )
$$;

-- Departments
alter table public.departments enable row level security;

drop policy if exists "departments_tenant_all" on public.departments;
create policy "departments_tenant_all" on public.departments
  for all
  using (public.viewer_in_company(company_id))
  with check (public.viewer_in_company(company_id));

-- Schedules
alter table public.schedules enable row level security;

drop policy if exists "schedules_tenant_all" on public.schedules;
create policy "schedules_tenant_all" on public.schedules
  for all
  using (public.viewer_in_company(company_id))
  with check (public.viewer_in_company(company_id));

-- Time off requests
alter table public.time_off_requests enable row level security;

drop policy if exists "time_off_requests_tenant_all" on public.time_off_requests;
create policy "time_off_requests_tenant_all" on public.time_off_requests
  for all
  using (
    public.viewer_in_company(company_id)
  )
  with check (
    public.viewer_in_company(company_id)
  );

-- Goals
alter table public.goals enable row level security;

drop policy if exists "goals_tenant_all" on public.goals;
create policy "goals_tenant_all" on public.goals
  for all
  using (public.viewer_in_company(company_id))
  with check (public.viewer_in_company(company_id));

-- Tasks
alter table public.tasks enable row level security;

drop policy if exists "tasks_tenant_all" on public.tasks;
create policy "tasks_tenant_all" on public.tasks
  for all
  using (public.viewer_in_company(company_id))
  with check (public.viewer_in_company(company_id));

-- Forms (scoped via owner profile)
alter table public.forms enable row level security;

drop policy if exists "forms_tenant_select" on public.forms;
create policy "forms_tenant_select" on public.forms
  for select
  using (
    exists (
      select 1
      from public.profiles viewer
      join public.profiles owner on owner.id = forms.created_by
      where viewer.id = auth.uid()
        and viewer.company_id = owner.company_id
        and coalesce(viewer.company_id::text, '') = coalesce(public.current_company_id(), '')
    )
  );

drop policy if exists "forms_tenant_mutation" on public.forms;
create policy "forms_tenant_mutation" on public.forms
  for all
  using (
    exists (
      select 1
      from public.profiles viewer
      join public.profiles owner on owner.id = forms.created_by
      where viewer.id = auth.uid()
        and viewer.company_id = owner.company_id
        and coalesce(viewer.company_id::text, '') = coalesce(public.current_company_id(), '')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles viewer
      join public.profiles owner on owner.id = forms.created_by
      where viewer.id = auth.uid()
        and viewer.company_id = owner.company_id
        and coalesce(viewer.company_id::text, '') = coalesce(public.current_company_id(), '')
    )
  );

commit;
