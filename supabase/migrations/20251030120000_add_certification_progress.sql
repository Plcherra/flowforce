-- Certification & Learning progress infrastructure --------------------------------

CREATE TYPE IF NOT EXISTS public.certification_status AS ENUM ('available', 'in_progress', 'earned', 'expired');
CREATE TYPE IF NOT EXISTS public.learning_course_status AS ENUM ('not_started', 'in_progress', 'completed');

CREATE TABLE IF NOT EXISTS public.certification_catalog (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  issuer text,
  badge_code text REFERENCES public.badge_catalog (code) ON DELETE SET NULL,
  requirement_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  xp_reward integer NOT NULL DEFAULT 0 CHECK (xp_reward >= 0),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS certification_catalog_code_idx ON public.certification_catalog (code);

CREATE TABLE IF NOT EXISTS public.certification_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  certification_code text NOT NULL REFERENCES public.certification_catalog (code) ON DELETE CASCADE,
  status public.certification_status NOT NULL DEFAULT 'available',
  progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  tasks_completed integer NOT NULL DEFAULT 0 CHECK (tasks_completed >= 0),
  xp_earned integer NOT NULL DEFAULT 0 CHECK (xp_earned >= 0),
  goals_completed integer NOT NULL DEFAULT 0 CHECK (goals_completed >= 0),
  courses_completed integer NOT NULL DEFAULT 0 CHECK (courses_completed >= 0),
  requirement_breakdown jsonb,
  achieved_at timestamptz,
  expires_at timestamptz,
  last_evaluated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (employee_id, certification_code)
);

CREATE INDEX IF NOT EXISTS certification_progress_employee_idx
  ON public.certification_progress (employee_id, certification_code);

CREATE INDEX IF NOT EXISTS certification_progress_status_idx
  ON public.certification_progress (status);

CREATE TABLE IF NOT EXISTS public.learning_courses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  level text,
  xp_value integer NOT NULL DEFAULT 0 CHECK (xp_value >= 0),
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.learning_course_progress (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  course_code text NOT NULL REFERENCES public.learning_courses (code) ON DELETE CASCADE,
  status public.learning_course_status NOT NULL DEFAULT 'not_started',
  progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  started_at timestamptz,
  completed_at timestamptz,
  last_interaction_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (employee_id, course_code)
);

CREATE INDEX IF NOT EXISTS learning_course_progress_employee_idx
  ON public.learning_course_progress (employee_id, course_code);

CREATE INDEX IF NOT EXISTS learning_course_progress_status_idx
  ON public.learning_course_progress (status);

-- Row level security ------------------------------------------------------------

ALTER TABLE public.certification_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view certification catalog"
  ON public.certification_catalog
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage certification catalog"
  ON public.certification_catalog
  FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view learning courses"
  ON public.learning_courses
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage learning courses"
  ON public.learning_courses
  FOR ALL
  USING (public.is_admin_or_manager(auth.uid()))
  WITH CHECK (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view own certification progress"
  ON public.certification_progress
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users upsert own certification progress"
  ON public.certification_progress
  FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Users update own certification progress"
  ON public.certification_progress
  FOR UPDATE
  USING (
    employee_id = auth.uid()
    OR public.is_admin_or_manager(auth.uid())
  )
  WITH CHECK (
    employee_id = auth.uid()
    OR public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Admins delete certification progress"
  ON public.certification_progress
  FOR DELETE
  USING (public.is_admin_or_manager(auth.uid()));

CREATE POLICY "Users view own course progress"
  ON public.learning_course_progress
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Users upsert own course progress"
  ON public.learning_course_progress
  FOR INSERT
  WITH CHECK (employee_id = auth.uid());

CREATE POLICY "Users update own course progress"
  ON public.learning_course_progress
  FOR UPDATE
  USING (
    employee_id = auth.uid()
    OR public.is_admin_or_manager(auth.uid())
  )
  WITH CHECK (
    employee_id = auth.uid()
    OR public.is_admin_or_manager(auth.uid())
  );

CREATE POLICY "Admins delete course progress"
  ON public.learning_course_progress
  FOR DELETE
  USING (public.is_admin_or_manager(auth.uid()));

-- Updated at triggers -----------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER set_certification_catalog_updated_at
      BEFORE UPDATE ON public.certification_catalog
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_certification_progress_updated_at
      BEFORE UPDATE ON public.certification_progress
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_learning_courses_updated_at
      BEFORE UPDATE ON public.learning_courses
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

    CREATE TRIGGER set_learning_course_progress_updated_at
      BEFORE UPDATE ON public.learning_course_progress
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER set_certification_catalog_updated_at
      BEFORE UPDATE ON public.certification_catalog
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER set_certification_progress_updated_at
      BEFORE UPDATE ON public.certification_progress
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER set_learning_courses_updated_at
      BEFORE UPDATE ON public.learning_courses
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    CREATE TRIGGER set_learning_course_progress_updated_at
      BEFORE UPDATE ON public.learning_course_progress
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END
$$;

-- Seed badges, courses, and certifications --------------------------------------

INSERT INTO public.badge_catalog (code, title, description, icon, min_level)
VALUES
  ('CERT_SERVICE_PRO', 'Customer Service Pro', 'Awarded for completing the customer service specialist certification', 'award', 1),
  ('CERT_LEADERSHIP_MASTERY', 'Leadership Mastery', 'Awarded for achieving the leadership advancement certification', 'award', 1),
  ('CERT_SAFETY_SENTINEL', 'Safety Sentinel', 'Awarded for completing the safety & compliance guardian certification', 'shield', 1)
ON CONFLICT (code) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  min_level = EXCLUDED.min_level,
  updated_at = timezone('utc', now());

INSERT INTO public.learning_courses (code, title, description, category, duration_minutes, level, xp_value, metadata)
VALUES
  (
    'cust-support-101',
    'Customer Care Foundations',
    'Core service recovery, empathy, and de-escalation toolkit.',
    'Customer Experience',
    120,
    'intermediate',
    200,
    jsonb_build_object('tagline', 'Empathetic resolutions at scale')
  ),
  (
    'leadership-essentials',
    'Team Leadership Essentials',
    'Coach, delegate, and align teams to goals with confidence.',
    'Leadership',
    240,
    'advanced',
    350,
    jsonb_build_object('tagline', 'Activate high-performing teams')
  ),
  (
    'safety-first',
    'Safety & Compliance Fundamentals',
    'Regulatory readiness, incident response, and workplace risk mitigation.',
    'Safety',
    90,
    'beginner',
    150,
    jsonb_build_object('tagline', 'Keep every shift incident-free')
  )
ON CONFLICT (code) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  duration_minutes = EXCLUDED.duration_minutes,
  level = EXCLUDED.level,
  xp_value = EXCLUDED.xp_value,
  metadata = EXCLUDED.metadata,
  updated_at = timezone('utc', now());

INSERT INTO public.certification_catalog (code, title, description, issuer, badge_code, requirement_config, xp_reward)
VALUES
  (
    'customer-service-specialist',
    'Customer Service Specialist',
    'Blend frontline task execution, positive recognition, and core CX training.',
    'FlowForce Academy',
    'CERT_SERVICE_PRO',
    jsonb_build_object(
      'tasks', jsonb_build_object('completed', 10),
      'goals', jsonb_build_object('completed', 1),
      'xp', jsonb_build_object('amount', 1500),
      'courses', jsonb_build_object('codes', jsonb_build_array('cust-support-101')),
      'reward', jsonb_build_object('xp', 250, 'autoAwardBadge', false)
    ),
    250
  ),
  (
    'leadership-advancement',
    'Leadership Advancement',
    'Elevate coaching, goal stewardship, and complete leadership mastery.',
    'FlowForce Academy',
    'CERT_LEADERSHIP_MASTERY',
    jsonb_build_object(
      'tasks', jsonb_build_object('completed', 6),
      'goals', jsonb_build_object('completed', 2),
      'xp', jsonb_build_object('amount', 2200),
      'courses', jsonb_build_object('codes', jsonb_build_array('leadership-essentials')),
      'reward', jsonb_build_object('xp', 400, 'autoAwardBadge', false)
    ),
    400
  ),
  (
    'safety-compliance-guardian',
    'Safety & Compliance Guardian',
    'Demonstrate safety vigilance with certified learning and checklist mastery.',
    'FlowForce Academy',
    'CERT_SAFETY_SENTINEL',
    jsonb_build_object(
      'tasks', jsonb_build_object('completed', 8),
      'xp', jsonb_build_object('amount', 1000),
      'courses', jsonb_build_object('codes', jsonb_build_array('safety-first')),
      'reward', jsonb_build_object('xp', 180, 'autoAwardBadge', false)
    ),
    180
  )
ON CONFLICT (code) DO UPDATE
SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  issuer = EXCLUDED.issuer,
  badge_code = EXCLUDED.badge_code,
  requirement_config = EXCLUDED.requirement_config,
  xp_reward = EXCLUDED.xp_reward,
  updated_at = timezone('utc', now());
