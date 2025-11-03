BEGIN;

-- ---------------------------------------------------------------------------
-- Performance review infrastructure
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.goals (id) ON DELETE SET NULL,
  ai_insight_id uuid REFERENCES public.ai_insights (id) ON DELETE SET NULL,
  review_cycle text NOT NULL DEFAULT 'Quarterly',
  review_period_start date,
  review_period_end date,
  review_date date NOT NULL DEFAULT (current_date),
  reviewer_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  score numeric(4,2) NOT NULL CHECK (score >= 1 AND score <= 5),
  summary text,
  ai_summary text,
  action_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS performance_reviews_company_employee_idx
  ON public.performance_reviews (company_id, employee_id, review_date DESC);

CREATE INDEX IF NOT EXISTS performance_reviews_goal_idx
  ON public.performance_reviews (goal_id);

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Employees view their reviews"
  ON public.performance_reviews
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = performance_reviews.company_id
        AND p.role IN ('manager', 'admin', 'company_admin', 'owner', 'supervisor')
    )
  );

CREATE POLICY IF NOT EXISTS "Managers manage performance reviews"
  ON public.performance_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = performance_reviews.company_id
        AND p.role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.company_id = performance_reviews.company_id
        AND p.role IN ('manager', 'admin', 'company_admin', 'owner')
    )
  );

DROP TRIGGER IF EXISTS update_performance_reviews_updated_at ON public.performance_reviews;
CREATE TRIGGER update_performance_reviews_updated_at
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Ensure AI insights can link directly to goals
ALTER TABLE public.ai_insights
  ADD COLUMN IF NOT EXISTS goal_id uuid;

ALTER TABLE public.ai_insights
  ADD CONSTRAINT IF NOT EXISTS ai_insights_goal_id_fkey
  FOREIGN KEY (goal_id) REFERENCES public.goals (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS ai_insights_goal_idx
  ON public.ai_insights (goal_id, insight_type);

-- View to surface unified performance context
CREATE OR REPLACE VIEW public.performance_goal_reviews AS
SELECT
  pr.id AS review_id,
  pr.company_id,
  pr.employee_id,
  pr.goal_id,
  pr.review_cycle,
  pr.review_period_start,
  pr.review_period_end,
  pr.review_date,
  pr.reviewer_id,
  pr.score,
  pr.summary,
  pr.ai_summary,
  pr.action_items,
  pr.created_at,
  pr.updated_at,
  g.title AS goal_title,
  g.status AS goal_status,
  g.progress AS goal_progress,
  g.target_completion_date,
  g.completed_at AS goal_completed_at,
  g.priority AS goal_priority,
  g.created_by AS goal_owner_id,
  ai.id AS ai_insight_id,
  ai.insight_type,
  ai.data AS insight_data,
  ai.generated_at AS insight_generated_at,
  ai.expires_at AS insight_expires_at
FROM public.performance_reviews pr
LEFT JOIN public.goals g
  ON g.id = pr.goal_id
LEFT JOIN public.ai_insights ai
  ON ai.id = pr.ai_insight_id
     OR (ai.goal_id = pr.goal_id AND ai.insight_type IN ('performance.review', 'performance.summary'));

ALTER VIEW public.performance_goal_reviews SET (security_invoker = true);

-- Seed mock performance review data where possible
DO $$
DECLARE
  seeded_count integer;
BEGIN
  SELECT COUNT(*) INTO seeded_count FROM public.performance_reviews;
  IF seeded_count = 0 THEN
    WITH sample_goal AS (
      SELECT g.company_id, g.id AS goal_id, gp.user_id AS employee_id, g.created_by AS reviewer_id
      FROM public.goals g
      JOIN public.goal_participants gp ON gp.goal_id = g.id
      LIMIT 1
    ),
    insight AS (
      INSERT INTO public.ai_insights (company_id, insight_type, data, goal_id)
      SELECT sg.company_id,
             'performance.summary',
             jsonb_build_object(
               'goal_id', sg.goal_id,
               'headline', 'AI summary: strong momentum',
               'recommendations', jsonb_build_array('Sustain weekly coaching cadence', 'Highlight wins in team standup')),
             sg.goal_id
      FROM sample_goal sg
      ON CONFLICT DO NOTHING
      RETURNING id
    )
    INSERT INTO public.performance_reviews (
      company_id,
      employee_id,
      goal_id,
      ai_insight_id,
      review_cycle,
      review_period_start,
      review_period_end,
      review_date,
      reviewer_id,
      score,
      summary,
      ai_summary,
      action_items
    )
    SELECT
      sg.company_id,
      sg.employee_id,
      sg.goal_id,
      (SELECT id FROM insight LIMIT 1),
      'Quarterly',
      (current_date - interval '90 days')::date,
      current_date,
      current_date,
      sg.reviewer_id,
      4.3,
      'Maintained customer NPS above target with proactive coaching.',
      'AI flagged consistency improvements across service metrics.',
      jsonb_build_array(
        jsonb_build_object('label', 'Shadow leadership standups', 'status', 'open'),
        jsonb_build_object('label', 'Document feedback loops', 'status', 'in_progress')
      )
    FROM sample_goal sg;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Recognition automation infrastructure
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recognition_award_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies (id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  trigger_type text NOT NULL CHECK (trigger_type IN ('goal_completed', 'goal_streak', 'recognition_count', 'learning_completed')),
  threshold integer NOT NULL CHECK (threshold >= 1),
  badge_code text,
  xp_award integer NOT NULL DEFAULT 0 CHECK (xp_award >= 0),
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.recognition_award_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Company members view award rules"
  ON public.recognition_award_rules
  FOR SELECT
  USING (
    company_id IS NULL
    OR company_id = get_user_company_id()
  );

CREATE POLICY IF NOT EXISTS "Managers manage award rules"
  ON public.recognition_award_rules
  FOR ALL
  USING (
    (company_id IS NULL AND is_admin_or_manager(auth.uid()))
    OR (
      company_id = get_user_company_id()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('manager', 'admin', 'company_admin', 'owner')
      )
    )
  )
  WITH CHECK (
    (company_id IS NULL AND is_admin_or_manager(auth.uid()))
    OR (
      company_id = get_user_company_id()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.role IN ('manager', 'admin', 'company_admin', 'owner')
      )
    )
  );

DROP TRIGGER IF EXISTS update_recognition_award_rules_updated_at ON public.recognition_award_rules;
CREATE TRIGGER update_recognition_award_rules_updated_at
  BEFORE UPDATE ON public.recognition_award_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

INSERT INTO public.recognition_award_rules (company_id, code, trigger_type, threshold, badge_code, xp_award, description, metadata)
VALUES
  (NULL, 'GOAL_BRONZE_STAR', 'goal_completed', 5, 'bronze_star', 150, 'Complete 5 goals to earn a Bronze Star.', jsonb_build_object('tier', 'Bronze')),
  (NULL, 'GOAL_SILVER_STAR', 'goal_completed', 10, 'silver_star', 300, 'Complete 10 goals to earn a Silver Star.', jsonb_build_object('tier', 'Silver')),
  (NULL, 'GOAL_GOLD_STAR', 'goal_completed', 20, 'gold_star', 600, 'Complete 20 goals to earn a Gold Star.', jsonb_build_object('tier', 'Gold')),
  (NULL, 'LEARNING_PATHFINDER', 'learning_completed', 5, 'learning_path', 250, 'Complete 5 courses to unlock Learning Pathfinder.', jsonb_build_object('category', 'Learning'))
ON CONFLICT (code) DO UPDATE
SET
  trigger_type = EXCLUDED.trigger_type,
  threshold = EXCLUDED.threshold,
  badge_code = EXCLUDED.badge_code,
  xp_award = EXCLUDED.xp_award,
  description = EXCLUDED.description,
  metadata = EXCLUDED.metadata,
  active = true,
  updated_at = timezone('utc', now());

ALTER TABLE public.goal_rewards
  ADD COLUMN IF NOT EXISTS award_rule text;

CREATE OR REPLACE VIEW public.recognitions AS
SELECT
  gr.id,
  gr.company_id,
  gr.goal_id,
  gr.user_id,
  gr.reward_type,
  gr.reward_details,
  gr.awarded_at,
  gr.created_by,
  gr.award_rule,
  recipient.first_name AS recipient_first_name,
  recipient.last_name AS recipient_last_name,
  recipient.avatar_url AS recipient_avatar_url,
  recipient.department_id AS recipient_department_id,
  creator.first_name AS creator_first_name,
  creator.last_name AS creator_last_name,
  g.title AS goal_title,
  g.status AS goal_status,
  g.progress AS goal_progress,
  g.target_completion_date,
  (gr.reward_details ->> 'message') AS message
FROM public.goal_rewards gr
LEFT JOIN public.profiles recipient ON recipient.id = gr.user_id
LEFT JOIN public.profiles creator ON creator.id = gr.created_by
LEFT JOIN public.goals g ON g.id = gr.goal_id
WHERE gr.reward_type = 'recognition';

ALTER VIEW public.recognitions SET (security_invoker = true);

-- ---------------------------------------------------------------------------
-- Learning progress tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES public.learning_enrollments (id) ON DELETE CASCADE,
  module_id uuid REFERENCES public.learning_modules (id) ON DELETE SET NULL,
  progress_percent numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  time_spent_minutes integer NOT NULL DEFAULT 0 CHECK (time_spent_minutes >= 0),
  quiz_score numeric(5,2) CHECK (quiz_score IS NULL OR (quiz_score >= 0 AND quiz_score <= 100)),
  ai_recommendation text,
  recorded_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  recorded_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS learning_progress_enrollment_idx
  ON public.learning_progress (enrollment_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS learning_progress_module_idx
  ON public.learning_progress (module_id);

ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Learners view progress"
  ON public.learning_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_enrollments le
      WHERE le.id = learning_progress.enrollment_id
        AND (
          le.employee_id = auth.uid()
          OR le.company_id = get_user_company_id()
        )
    )
  );

CREATE POLICY IF NOT EXISTS "Admins manage learning progress"
  ON public.learning_progress
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.learning_enrollments le
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE le.id = learning_progress.enrollment_id
        AND le.company_id = p.company_id
        AND p.role IN ('manager', 'admin', 'company_admin', 'owner', 'trainer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.learning_enrollments le
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE le.id = learning_progress.enrollment_id
        AND le.company_id = p.company_id
        AND p.role IN ('manager', 'admin', 'company_admin', 'owner', 'trainer')
    )
  );

DROP TRIGGER IF EXISTS update_learning_progress_updated_at ON public.learning_progress;
CREATE TRIGGER update_learning_progress_updated_at
  BEFORE UPDATE ON public.learning_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ---------------------------------------------------------------------------
-- Time off workflow adjustments
-- ---------------------------------------------------------------------------
UPDATE public.time_off_requests
SET status = CASE status
  WHEN 'pending' THEN 'requested'
  WHEN 'rejected' THEN 'denied'
  ELSE status
END;

ALTER TABLE public.time_off_requests
  ALTER COLUMN status SET DEFAULT 'requested';

ALTER TABLE public.time_off_requests
  DROP CONSTRAINT IF EXISTS time_off_requests_status_check;

ALTER TABLE public.time_off_requests
  ADD CONSTRAINT time_off_requests_status_check
  CHECK (status IN ('requested', 'approved', 'denied'));

COMMIT;
