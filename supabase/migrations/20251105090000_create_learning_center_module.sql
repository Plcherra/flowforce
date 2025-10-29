-- Learning Center core tables -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  level_requirement integer NOT NULL DEFAULT 1 CHECK (level_requirement >= 1),
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  estimated_hours numeric NOT NULL DEFAULT 0 CHECK (estimated_hours >= 0),
  delivery_mode text NOT NULL DEFAULT 'self_paced',
  target_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  featured boolean NOT NULL DEFAULT false,
  certification_code text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.learning_courses
  ADD CONSTRAINT learning_courses_certification_fk
  FOREIGN KEY (certification_code) REFERENCES public.badge_catalog (code)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.learning_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.learning_courses (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  content text,
  order_index integer NOT NULL DEFAULT 1 CHECK (order_index >= 1),
  estimated_minutes integer NOT NULL DEFAULT 20 CHECK (estimated_minutes >= 0),
  xp_award integer NOT NULL DEFAULT 0 CHECK (xp_award >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS learning_modules_course_idx
  ON public.learning_modules (course_id, order_index);

CREATE TABLE IF NOT EXISTS public.learning_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.learning_courses (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'in_progress',
  progress_percent numeric NOT NULL DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
  hours_completed numeric NOT NULL DEFAULT 0 CHECK (hours_completed >= 0),
  current_module integer NOT NULL DEFAULT 0 CHECK (current_module >= 0),
  level integer NOT NULL DEFAULT 1 CHECK (level >= 1),
  started_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  completed_at timestamptz,
  last_activity_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (course_id, employee_id)
);

CREATE INDEX IF NOT EXISTS learning_enrollments_employee_idx
  ON public.learning_enrollments (employee_id, status);

CREATE INDEX IF NOT EXISTS learning_enrollments_course_idx
  ON public.learning_enrollments (course_id);

CREATE TABLE IF NOT EXISTS public.learning_progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.learning_enrollments (id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.learning_modules (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  delta_progress numeric NOT NULL DEFAULT 0,
  delta_hours numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS learning_progress_events_enrollment_idx
  ON public.learning_progress_events (enrollment_id, created_at DESC);

-- Row level security ----------------------------------------------------------
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_progress_events ENABLE ROW LEVEL SECURITY;

-- Courses: everyone can read; managers/admins maintain ------------------------
CREATE POLICY "Learning courses are visible to authenticated users"
  ON public.learning_courses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Learning courses can be managed by training admins"
  ON public.learning_courses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  );

-- Modules follow course access ------------------------------------------------
CREATE POLICY "Learning modules are visible to authenticated users"
  ON public.learning_modules FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Learning modules managed by training admins"
  ON public.learning_modules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  );

-- Enrollments policies --------------------------------------------------------
CREATE POLICY "Employees can view their learning enrollments"
  ON public.learning_enrollments FOR SELECT
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'manager', 'admin', 'company_admin', 'owner')
    )
  );

CREATE POLICY "Employees can enroll themselves in courses"
  ON public.learning_enrollments FOR INSERT
  WITH CHECK (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  );

CREATE POLICY "Employees and admins can update enrollment progress"
  ON public.learning_enrollments FOR UPDATE
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'manager', 'admin', 'company_admin', 'owner')
    )
  )
  WITH CHECK (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('supervisor', 'manager', 'admin', 'company_admin', 'owner')
    )
  );

CREATE POLICY "Training admins can delete enrollments"
  ON public.learning_enrollments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  );

-- Progress events policies ----------------------------------------------------
CREATE POLICY "Progress events visible to related employees"
  ON public.learning_progress_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_enrollments le
      WHERE le.id = enrollment_id
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

CREATE POLICY "Progress events can be created by enrollment owners or admins"
  ON public.learning_progress_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_enrollments le
      WHERE le.id = enrollment_id
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

-- Updated at triggers ---------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER set_learning_courses_updated_at
      BEFORE UPDATE ON public.learning_courses
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_learning_enrollments_updated_at
      BEFORE UPDATE ON public.learning_enrollments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

-- Convenience view for analytics ---------------------------------------------
CREATE OR REPLACE VIEW public.learning_course_metrics AS
SELECT
  c.id AS course_id,
  c.title,
  c.category,
  c.xp_reward,
  c.estimated_hours,
  COUNT(e.*) FILTER (WHERE e.status IN ('completed', 'in_progress')) AS active_learners,
  COUNT(e.*) FILTER (WHERE e.status = 'completed') AS completions,
  AVG(e.progress_percent) FILTER (WHERE e.status != 'withdrawn') AS avg_progress,
  SUM(e.hours_completed) AS total_hours_completed,
  SUM(CASE WHEN e.status = 'completed' THEN c.xp_reward ELSE 0 END) AS total_xp_awarded
FROM public.learning_courses c
LEFT JOIN public.learning_enrollments e ON e.course_id = c.id
GROUP BY c.id, c.title, c.category, c.xp_reward, c.estimated_hours;

ALTER VIEW public.learning_course_metrics SET (security_invoker = true);
