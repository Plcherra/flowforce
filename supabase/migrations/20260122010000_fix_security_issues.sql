-- Fix Critical Security Issues from Supabase Linter
-- This migration addresses:
-- 1. SECURITY DEFINER views (4 errors)
-- 2. RLS disabled tables (6 errors)

BEGIN;

-- ============================================================================
-- PART 1: Fix SECURITY DEFINER Views
-- ============================================================================
-- SECURITY DEFINER views enforce permissions of the creator, not the querying user
-- This is a security risk. We need to recreate them without SECURITY DEFINER

-- 1. Fix calendar_unified_view
-- Drop any existing view first (CASCADE to handle dependencies)
DROP VIEW IF EXISTS public.calendar_unified_view CASCADE;

-- Recreate without SECURITY DEFINER
CREATE VIEW public.calendar_unified_view AS
SELECT 
  ce.id,
  ce.title,
  ce.description,
  ce.start_time,
  ce.end_time,
  ce.company_id,
  ce.created_by,
  ce.created_at,
  ce.updated_at,
  'calendar_event'::text as event_type,
  NULL::uuid as vendor_id,
  NULL::text as vendor_name,
  NULL::text as service_type
FROM public.calendar_events ce
UNION ALL
SELECT 
  vv.id,
  vv.vendor_name as title,
  vv.description,
  vv.start_time,
  vv.end_time,
  vv.company_id,
  NULL::uuid as created_by,
  vv.created_at,
  vv.created_at as updated_at,
  'vendor_visit'::text as event_type,
  vv.id as vendor_id,
  vv.vendor_name,
  vv.service_type
FROM public.vendor_visits vv;

-- 2. Fix calendar_events_full
DROP VIEW IF EXISTS public.calendar_events_full CASCADE;
CREATE OR REPLACE VIEW public.calendar_events_full AS
SELECT 
  e.*,
  COALESCE(json_agg(p.*) FILTER (WHERE p.id IS NOT NULL), '[]'::json) as participants
FROM public.calendar_events e
LEFT JOIN public.event_participants p ON p.event_id = e.id
GROUP BY e.id;

-- 3. Fix vendor_event (if it exists as a view)
DROP VIEW IF EXISTS public.vendor_event CASCADE;
CREATE OR REPLACE VIEW public.vendor_event AS
SELECT 
  vv.id,
  vv.vendor_name,
  vv.service_type,
  vv.location,
  vv.start_time,
  vv.end_time,
  vv.description,
  vv.company_id,
  vv.start_time::date as event_date,
  vv.end_time::date as event_end_date
FROM public.vendor_visits vv;

-- 4. Fix recognitions view
-- Check if recognitions view exists and what it's based on
DO $$
DECLARE
  has_recognition_events boolean;
  has_recognition_badges boolean;
  has_badge_id_col boolean;
  has_goal_rewards boolean;
  has_earned_at_col boolean;
  has_awarded_at_col boolean;
  has_xp_snapshot_col boolean;
  date_col text;
  xp_col text;
BEGIN
  -- Drop existing view
  DROP VIEW IF EXISTS public.recognitions CASCADE;
  
  -- Check what tables/columns exist
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recognition_events') INTO has_recognition_events;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recognition_badges') INTO has_recognition_badges;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'badge_id') INTO has_badge_id_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goal_rewards') INTO has_goal_rewards;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'earned_at') INTO has_earned_at_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'awarded_at') INTO has_awarded_at_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'xp_snapshot') INTO has_xp_snapshot_col;
  
  -- New schema: recognition_events with badge_id and recognition_badges exists
  IF has_recognition_events AND has_recognition_badges AND has_badge_id_col THEN
    CREATE OR REPLACE VIEW public.recognitions AS
    SELECT 
      re.id,
      re.badge_id,
      re.user_id,
      re.earned_at,
      re.xp_snapshot,
      rb.slug as badge_slug,
      rb.name as badge_name,
      rb.description as badge_description,
      rb.threshold_xp,
      rb.icon_url as badge_icon_url,
      p.first_name || ' ' || p.last_name as recipient_name,
      p.avatar_url as recipient_avatar
    FROM public.recognition_events re
    LEFT JOIN public.recognition_badges rb ON rb.id = re.badge_id
    LEFT JOIN public.profiles p ON p.id = re.user_id;
  -- recognition_events exists but no badge_id column - check what columns it has
  ELSIF has_recognition_events THEN
    -- Determine which date column exists
    IF has_earned_at_col THEN
      date_col := 're.earned_at';
    ELSIF has_awarded_at_col THEN
      date_col := 're.awarded_at';
    ELSE
      date_col := 'NULL::timestamptz';
    END IF;
    
    -- Determine which XP column exists
    IF has_xp_snapshot_col THEN
      xp_col := 're.xp_snapshot';
    ELSE
      xp_col := 'NULL::integer';
    END IF;
    
    -- Build and execute dynamic CREATE VIEW
    EXECUTE format('
      CREATE OR REPLACE VIEW public.recognitions AS
      SELECT 
        re.id,
        re.user_id,
        %s as earned_at,
        %s as xp_snapshot,
        NULL::uuid as badge_id,
        NULL::text as badge_slug,
        NULL::text as badge_name,
        NULL::text as badge_description,
        NULL::integer as threshold_xp,
        NULL::text as badge_icon_url,
        p.first_name || '' '' || p.last_name as recipient_name,
        p.avatar_url as recipient_avatar
      FROM public.recognition_events re
      LEFT JOIN public.profiles p ON p.id = re.user_id
    ', date_col, xp_col);
  -- Fallback to goal_rewards schema
  ELSIF has_goal_rewards THEN
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
  END IF;
END $$;

-- ============================================================================
-- PART 2: Enable RLS on Missing Tables (Only if RLS is not already enabled)
-- ============================================================================

-- Check and enable RLS only if not already enabled
DO $$
DECLARE
  table_rec RECORD;
BEGIN
  -- List of tables that need RLS
  FOR table_rec IN 
    SELECT unnest(ARRAY[
      'certifications',
      'learning_courses', 
      'recognition_events',
      'learning_progress',
      'certification_catalog',
      'gamification_xp'
    ]) AS table_name
  LOOP
    -- Check if table exists and RLS is not enabled
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = table_rec.table_name
    ) AND NOT EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = table_rec.table_name 
        AND rowsecurity = true
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_rec.table_name);
      RAISE NOTICE 'Enabled RLS on table: %', table_rec.table_name;
    END IF;
  END LOOP;
END $$;

-- 1. certifications (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'certifications') THEN
    DROP POLICY IF EXISTS "certifications_tenant_isolation" ON public.certifications;
    CREATE POLICY "certifications_tenant_isolation" ON public.certifications
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND (
              certifications.company_id IS NULL
              OR p.company_id = certifications.company_id
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND (
              certifications.company_id IS NULL
              OR p.company_id = certifications.company_id
            )
        )
      );
  END IF;
END $$;

-- 2. learning_courses (update policy if needed - RLS already enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'learning_courses') THEN
    -- Check if company_id column exists, if so add tenant isolation policy
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'learning_courses' 
        AND column_name = 'company_id'
    ) THEN
      DROP POLICY IF EXISTS "learning_courses_tenant_isolation" ON public.learning_courses;
      CREATE POLICY "learning_courses_tenant_isolation" ON public.learning_courses
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                learning_courses.company_id IS NULL
                OR p.company_id = learning_courses.company_id
              )
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                learning_courses.company_id IS NULL
                OR p.company_id = learning_courses.company_id
              )
          )
        );
    END IF;
  END IF;
END $$;

-- 3. recognition_events
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recognition_events') THEN
    DROP POLICY IF EXISTS "recognition_events_tenant_isolation" ON public.recognition_events;
    CREATE POLICY "recognition_events_tenant_isolation" ON public.recognition_events
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND (
              p.id = recognition_events.user_id
              OR EXISTS (
                SELECT 1 FROM public.profiles p2
                WHERE p2.id = recognition_events.user_id
                  AND p2.company_id = p.company_id
              )
            )
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.id = recognition_events.user_id
        )
      );
  END IF;
END $$;

-- 4. learning_progress
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'learning_progress') THEN
    DROP POLICY IF EXISTS "learning_progress_tenant_isolation" ON public.learning_progress;
    CREATE POLICY "learning_progress_tenant_isolation" ON public.learning_progress
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.id = learning_progress.user_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.id = learning_progress.user_id
        )
      );
  END IF;
END $$;

-- 5. certification_catalog (update policy if needed - RLS already enabled)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'certification_catalog') THEN
    -- Check if company_id column exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'certification_catalog' 
        AND column_name = 'company_id'
    ) THEN
      DROP POLICY IF EXISTS "certification_catalog_tenant_isolation" ON public.certification_catalog;
      CREATE POLICY "certification_catalog_tenant_isolation" ON public.certification_catalog
        FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                certification_catalog.company_id IS NULL
                OR p.company_id = certification_catalog.company_id
              )
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid()
              AND (
                certification_catalog.company_id IS NULL
                OR p.company_id = certification_catalog.company_id
              )
          )
        );
    END IF;
  END IF;
END $$;

-- 6. gamification_xp (if table exists)
DO $$
DECLARE
  has_company_id_col boolean;
  policy_sql text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gamification_xp') THEN
    -- Check if company_id column exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'gamification_xp' 
        AND column_name = 'company_id'
    ) INTO has_company_id_col;
    
    DROP POLICY IF EXISTS "gamification_xp_tenant_isolation" ON public.gamification_xp;
    
    -- Build policy SQL based on whether company_id exists
    IF has_company_id_col THEN
      -- Policy with company_id check
      policy_sql := '
        CREATE POLICY "gamification_xp_tenant_isolation" ON public.gamification_xp
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND (
                  p.id = gamification_xp.user_id
                  OR p.company_id = gamification_xp.company_id
                )
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.company_id = gamification_xp.company_id
            )
          )
      ';
    ELSE
      -- Policy without company_id (user can only see their own)
      policy_sql := '
        CREATE POLICY "gamification_xp_tenant_isolation" ON public.gamification_xp
          FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.id = gamification_xp.user_id
            )
          )
          WITH CHECK (
            EXISTS (
              SELECT 1 FROM public.profiles p
              WHERE p.id = auth.uid()
                AND p.id = gamification_xp.user_id
            )
          )
      ';
    END IF;
    
    EXECUTE policy_sql;
  END IF;
END $$;

-- ============================================================================
-- PART 3: Add Missing Indexes for Performance (Critical Foreign Keys)
-- ============================================================================

-- Add indexes conditionally based on table/column existence
DO $$
BEGIN
  -- certifications indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'certifications') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'certifications' AND column_name = 'company_id') THEN
      CREATE INDEX IF NOT EXISTS idx_certifications_company_id ON public.certifications(company_id);
    END IF;
  END IF;

  -- learning_courses indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'learning_courses') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'learning_courses' AND column_name = 'company_id') THEN
      CREATE INDEX IF NOT EXISTS idx_learning_courses_company_id ON public.learning_courses(company_id);
    END IF;
  END IF;

  -- recognition_events indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recognition_events') THEN
    CREATE INDEX IF NOT EXISTS idx_recognition_events_user_id ON public.recognition_events(user_id);
    -- Check which date column exists and create index on it
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'earned_at') THEN
      CREATE INDEX IF NOT EXISTS idx_recognition_events_earned_at ON public.recognition_events(earned_at DESC);
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'awarded_at') THEN
      CREATE INDEX IF NOT EXISTS idx_recognition_events_awarded_at ON public.recognition_events(awarded_at DESC);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'badge_id') THEN
      CREATE INDEX IF NOT EXISTS idx_recognition_events_badge_id ON public.recognition_events(badge_id);
    END IF;
  END IF;

  -- learning_progress indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'learning_progress') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'learning_progress' AND column_name = 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_learning_progress_user_id ON public.learning_progress(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'learning_progress' AND column_name = 'course_id') THEN
      CREATE INDEX IF NOT EXISTS idx_learning_progress_course_id ON public.learning_progress(course_id);
    END IF;
  END IF;

  -- certification_catalog indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'certification_catalog') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'certification_catalog' AND column_name = 'company_id') THEN
      CREATE INDEX IF NOT EXISTS idx_certification_catalog_company_id ON public.certification_catalog(company_id);
    END IF;
  END IF;

  -- gamification_xp indexes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'gamification_xp') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gamification_xp' AND column_name = 'user_id') THEN
      CREATE INDEX IF NOT EXISTS idx_gamification_xp_user_id ON public.gamification_xp(user_id);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'gamification_xp' AND column_name = 'company_id') THEN
      CREATE INDEX IF NOT EXISTS idx_gamification_xp_company_id ON public.gamification_xp(company_id);
    END IF;
  END IF;
END $$;

COMMIT;
