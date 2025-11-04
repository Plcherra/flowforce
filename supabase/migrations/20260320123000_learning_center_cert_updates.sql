-- Learning & Certification integration enhancements -----------------------------------

-- Link learning courses to certification catalog entries and scheduling metadata
ALTER TABLE public.learning_courses
  ADD COLUMN IF NOT EXISTS certification_id uuid REFERENCES public.certification_catalog (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS role_unlock text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS auto_schedule_eligible boolean NOT NULL DEFAULT false;

-- Extend certification catalog so records can drive role unlocks and course mappings
ALTER TABLE public.certification_catalog
  ADD COLUMN IF NOT EXISTS unlocks_role text,
  ADD COLUMN IF NOT EXISTS linked_course_id uuid REFERENCES public.learning_courses (id) ON DELETE SET NULL;

-- Track when learners finish courses and award XP / certification credits
CREATE TABLE IF NOT EXISTS public.learning_completions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid REFERENCES public.companies (id) ON DELETE SET NULL,
  employee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.learning_courses (id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  xp_earned integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  passed boolean NOT NULL DEFAULT false,
  certification_awarded uuid REFERENCES public.certification_catalog (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS learning_completions_employee_course_idx
  ON public.learning_completions (employee_id, course_id);

CREATE INDEX IF NOT EXISTS learning_completions_company_idx
  ON public.learning_completions (company_id, completed_at DESC);

-- Record definitive certification awards for employees
CREATE TABLE IF NOT EXISTS public.employee_certifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  certification_id uuid NOT NULL REFERENCES public.certification_catalog (id) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  awarded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes text,
  UNIQUE (employee_id, certification_id)
);

CREATE INDEX IF NOT EXISTS employee_certifications_employee_idx
  ON public.employee_certifications (employee_id, certification_id);

ALTER TABLE public.learning_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learning completions are visible to company admins"
  ON public.learning_completions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'manager' OR p.role = 'company_admin' OR p.role = 'owner' OR p.role = 'admin')
        AND (learning_completions.company_id IS NULL OR p.company_id = learning_completions.company_id)
    )
  );

CREATE POLICY "Learners view their own completions"
  ON public.learning_completions
  FOR SELECT
  USING (employee_id = auth.uid());

CREATE POLICY "Learners can insert their completion records"
  ON public.learning_completions
  FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Admins manage learning completions"
  ON public.learning_completions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'manager' OR p.role = 'company_admin' OR p.role = 'owner' OR p.role = 'admin')
        AND (learning_completions.company_id IS NULL OR p.company_id = learning_completions.company_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'manager' OR p.role = 'company_admin' OR p.role = 'owner' OR p.role = 'admin')
        AND (learning_completions.company_id IS NULL OR p.company_id = learning_completions.company_id)
    )
  );

CREATE POLICY "Employees see awarded certifications"
  ON public.employee_certifications
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'manager' OR p.role = 'company_admin' OR p.role = 'owner' OR p.role = 'admin')
        AND p.company_id = (
          SELECT company_id FROM public.profiles pr WHERE pr.id = employee_id
        )
    )
  );

CREATE POLICY "Admins manage employee certifications"
  ON public.employee_certifications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'manager' OR p.role = 'company_admin' OR p.role = 'owner' OR p.role = 'admin')
        AND p.company_id = (
          SELECT company_id FROM public.profiles pr WHERE pr.id = employee_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'manager' OR p.role = 'company_admin' OR p.role = 'owner' OR p.role = 'admin')
        AND p.company_id = (
          SELECT company_id FROM public.profiles pr WHERE pr.id = employee_id
        )
    )
  );
