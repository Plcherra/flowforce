-- Align org-level availability preferences with company-aware policies

-- 1) Ensure availability_lock_mode enum exists
CREATE TYPE IF NOT EXISTS public.availability_lock_mode AS ENUM ('auto', 'open', 'lock');

-- 2) Ensure org_prefs table exists with expected columns/defaults
CREATE TABLE IF NOT EXISTS public.org_prefs (
  id uuid PRIMARY KEY,
  availability_lock_mode public.availability_lock_mode NOT NULL DEFAULT 'open',
  auto_lock_day_of_week integer NOT NULL DEFAULT 4 CHECK (auto_lock_day_of_week BETWEEN 0 AND 6),
  auto_lock_hour integer NOT NULL DEFAULT 17 CHECK (auto_lock_hour BETWEEN 0 AND 23),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure the id column does not auto-generate so we can upsert by company id
ALTER TABLE public.org_prefs
  ALTER COLUMN id DROP DEFAULT;

-- Remove legacy single-row constraint so multiple companies can store preferences
DROP INDEX IF EXISTS org_prefs_single_row_idx;

-- Guarantee timestamps continue to update automatically
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at')
     AND NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_org_prefs_updated_at') THEN
    CREATE TRIGGER set_org_prefs_updated_at
      BEFORE UPDATE ON public.org_prefs
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END
$$;

-- 3) Refresh RLS policies: employees can read, managers/owners can write
ALTER TABLE public.org_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org prefs readable" ON public.org_prefs;
DROP POLICY IF EXISTS "Managers update org prefs" ON public.org_prefs;
DROP POLICY IF EXISTS "Org prefs select same company" ON public.org_prefs;
DROP POLICY IF EXISTS "Org prefs managers upsert" ON public.org_prefs;
DROP POLICY IF EXISTS "Org prefs managers update" ON public.org_prefs;
DROP POLICY IF EXISTS "Org prefs managers delete" ON public.org_prefs;

CREATE POLICY "Org prefs select same company" ON public.org_prefs
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = public.org_prefs.id
          OR (p.company_id IS NULL AND public.org_prefs.id = '00000000-0000-0000-0000-000000000001')
        )
    )
  );

CREATE POLICY "Org prefs managers upsert" ON public.org_prefs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = public.org_prefs.id
          OR (p.company_id IS NULL AND public.org_prefs.id = '00000000-0000-0000-0000-000000000001')
        )
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

CREATE POLICY "Org prefs managers update" ON public.org_prefs
  FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = public.org_prefs.id
          OR (p.company_id IS NULL AND public.org_prefs.id = '00000000-0000-0000-0000-000000000001')
        )
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = public.org_prefs.id
          OR (p.company_id IS NULL AND public.org_prefs.id = '00000000-0000-0000-0000-000000000001')
        )
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

CREATE POLICY "Org prefs managers delete" ON public.org_prefs
  FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (
          p.company_id = public.org_prefs.id
          OR (p.company_id IS NULL AND public.org_prefs.id = '00000000-0000-0000-0000-000000000001')
        )
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

-- 4) Seed a default row for every company referenced by profiles
INSERT INTO public.org_prefs (id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour)
SELECT DISTINCT p.company_id, 'open', 4, 17
FROM public.profiles p
WHERE p.company_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- Maintain compatibility default row for legacy single-org deployments
INSERT INTO public.org_prefs (id, availability_lock_mode, auto_lock_day_of_week, auto_lock_hour)
VALUES ('00000000-0000-0000-0000-000000000001', 'open', 4, 17)
ON CONFLICT (id) DO NOTHING;
