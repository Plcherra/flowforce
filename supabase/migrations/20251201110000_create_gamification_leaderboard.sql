-- Gamification leaderboard table to consolidate XP, badges, and Copilot insights
CREATE TABLE IF NOT EXISTS public.gamification_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  department_id uuid REFERENCES public.departments (id) ON DELETE SET NULL,
  role text NOT NULL,
  period text NOT NULL CHECK (period IN ('weekly', 'monthly', 'all_time')),
  period_start date,
  period_end date,
  xp_total integer NOT NULL DEFAULT 0 CHECK (xp_total >= 0),
  xp_tasks integer NOT NULL DEFAULT 0 CHECK (xp_tasks >= 0),
  xp_goals integer NOT NULL DEFAULT 0 CHECK (xp_goals >= 0),
  xp_recognitions integer NOT NULL DEFAULT 0 CHECK (xp_recognitions >= 0),
  xp_training integer NOT NULL DEFAULT 0 CHECK (xp_training >= 0),
  badge_tier text NOT NULL DEFAULT 'Bronze',
  badge_codes text[] NOT NULL DEFAULT ARRAY[]::text[],
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  challenges jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_challenge_triggered timestamptz,
  last_synced_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (employee_id, period, period_start)
);

CREATE INDEX IF NOT EXISTS gamification_leaderboard_company_period_idx
  ON public.gamification_leaderboard (company_id, period, period_start DESC);

CREATE INDEX IF NOT EXISTS gamification_leaderboard_employee_period_idx
  ON public.gamification_leaderboard (employee_id, period, period_start DESC);

ALTER TABLE public.gamification_leaderboard
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leaderboard readable by company members"
  ON public.gamification_leaderboard
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = gamification_leaderboard.company_id
          OR p.role IN ('manager', 'admin', 'company_admin', 'owner', 'supervisor')
        )
    )
  );

CREATE POLICY "Leaderboard maintained by managers"
  ON public.gamification_leaderboard
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = gamification_leaderboard.company_id
          AND p.role IN ('manager', 'admin', 'company_admin', 'owner')
        )
    )
  );

CREATE POLICY "Leaderboard updated by managers"
  ON public.gamification_leaderboard
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = gamification_leaderboard.company_id
          AND p.role IN ('manager', 'admin', 'company_admin', 'owner')
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = gamification_leaderboard.company_id
          AND p.role IN ('manager', 'admin', 'company_admin', 'owner')
        )
    )
  );

CREATE POLICY "Leaderboard removable by admins"
  ON public.gamification_leaderboard
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = gamification_leaderboard.company_id
          AND p.role IN ('admin', 'company_admin', 'owner')
        )
    )
  );

CREATE TRIGGER update_gamification_leaderboard_updated_at
  BEFORE UPDATE ON public.gamification_leaderboard
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
