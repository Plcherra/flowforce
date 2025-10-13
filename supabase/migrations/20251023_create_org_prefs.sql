-- Org preferences foundation (idempotent to support repeat deployments)

-- Ensure enum exists -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'availability_lock_mode'
  ) THEN
    CREATE TYPE public.availability_lock_mode AS ENUM ('auto', 'open', 'lock');
  END IF;
END
$$;

-- Table definition ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.org_prefs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  availability_lock_mode public.availability_lock_mode NOT NULL DEFAULT 'open',
  auto_lock_day_of_week integer NOT NULL DEFAULT 4 CHECK (auto_lock_day_of_week BETWEEN 0 AND 6),
  auto_lock_hour integer NOT NULL DEFAULT 17 CHECK (auto_lock_hour BETWEEN 0 AND 23),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX IF NOT EXISTS org_prefs_single_row_idx ON public.org_prefs ((1));

-- Updated_at trigger -------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    DROP TRIGGER IF EXISTS set_org_prefs_updated_at ON public.org_prefs;
    CREATE TRIGGER set_org_prefs_updated_at
      BEFORE UPDATE ON public.org_prefs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

-- Row level security -------------------------------------------------------
ALTER TABLE public.org_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org prefs readable" ON public.org_prefs;
CREATE POLICY "Org prefs readable" ON public.org_prefs
  FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Managers update org prefs" ON public.org_prefs;
CREATE POLICY "Managers update org prefs" ON public.org_prefs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

-- Seed default preferences -------------------------------------------------
INSERT INTO public.org_prefs (id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour)
VALUES ('00000000-0000-0000-0000-000000000001', 'auto', 4, 17)
ON CONFLICT (id) DO UPDATE
SET availability_lock_mode = EXCLUDED.availability_lock_mode,
    auto_lock_day_of_week = EXCLUDED.auto_lock_day_of_week,
    auto_lock_hour = EXCLUDED.auto_lock_hour;
