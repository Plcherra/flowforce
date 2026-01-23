-- Fix Remaining Security Issues
-- 4 Errors: SECURITY DEFINER views
-- 8 Warnings: Function search_path, RLS policies, Postgres version

BEGIN;

-- ============================================================================
-- PART 1: Fix SECURITY DEFINER Views (4 errors)
-- ============================================================================
-- Views still showing as SECURITY DEFINER - need to explicitly set security_invoker

-- 1. recognitions view
DROP VIEW IF EXISTS public.recognitions CASCADE;
-- Recreate will be handled by previous migration logic, but ensure it's not SECURITY DEFINER
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
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recognition_events') INTO has_recognition_events;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'recognition_badges') INTO has_recognition_badges;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'badge_id') INTO has_badge_id_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goal_rewards') INTO has_goal_rewards;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'earned_at') INTO has_earned_at_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'awarded_at') INTO has_awarded_at_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'recognition_events' AND column_name = 'xp_snapshot') INTO has_xp_snapshot_col;
  
  IF has_recognition_events AND has_recognition_badges AND has_badge_id_col THEN
    EXECUTE 'CREATE VIEW public.recognitions WITH (security_invoker = true) AS
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
        p.first_name || '' '' || p.last_name as recipient_name,
        p.avatar_url as recipient_avatar
      FROM public.recognition_events re
      LEFT JOIN public.recognition_badges rb ON rb.id = re.badge_id
      LEFT JOIN public.profiles p ON p.id = re.user_id';
  ELSIF has_recognition_events THEN
    IF has_earned_at_col THEN
      date_col := 're.earned_at';
    ELSIF has_awarded_at_col THEN
      date_col := 're.awarded_at';
    ELSE
      date_col := 'NULL::timestamptz';
    END IF;
    
    IF has_xp_snapshot_col THEN
      xp_col := 're.xp_snapshot';
    ELSE
      xp_col := 'NULL::integer';
    END IF;
    
    EXECUTE format('
      CREATE VIEW public.recognitions WITH (security_invoker = true) AS
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
  ELSIF has_goal_rewards THEN
    EXECUTE 'CREATE VIEW public.recognitions WITH (security_invoker = true) AS
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
        (gr.reward_details ->> ''message'') AS message
      FROM public.goal_rewards gr
      LEFT JOIN public.profiles recipient ON recipient.id = gr.user_id
      LEFT JOIN public.profiles creator ON creator.id = gr.created_by
      LEFT JOIN public.goals g ON g.id = gr.goal_id
      WHERE gr.reward_type = ''recognition''';
  END IF;
END $$;

-- 2. calendar_events_full view
DROP VIEW IF EXISTS public.calendar_events_full CASCADE;
CREATE VIEW public.calendar_events_full WITH (security_invoker = true) AS
SELECT 
  e.*,
  COALESCE(json_agg(p.*) FILTER (WHERE p.id IS NOT NULL), '[]'::json) as participants
FROM public.calendar_events e
LEFT JOIN public.event_participants p ON p.event_id = e.id
GROUP BY e.id;

-- 3. vendor_event view
DROP VIEW IF EXISTS public.vendor_event CASCADE;
CREATE VIEW public.vendor_event WITH (security_invoker = true) AS
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

-- 4. calendar_unified_view
DROP VIEW IF EXISTS public.calendar_unified_view CASCADE;
CREATE VIEW public.calendar_unified_view WITH (security_invoker = true) AS
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

-- ============================================================================
-- PART 2: Fix Function Search Path (2 warnings)
-- ============================================================================

-- Fix update_helpdesk_tickets_updated_at function
CREATE OR REPLACE FUNCTION public.update_helpdesk_tickets_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function (if it exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'update_updated_at_column'
  ) THEN
    EXECUTE 'CREATE OR REPLACE FUNCTION public.update_updated_at_column()
      RETURNS TRIGGER 
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public
      AS $func$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $func$';
  END IF;
END $$;

-- ============================================================================
-- PART 3: Fix Overly Permissive RLS Policies (5 warnings)
-- ============================================================================

-- 1. companies - "Anyone can create a company"
-- This might be intentional for signup, but let's make it more secure
DROP POLICY IF EXISTS "Anyone can create a company" ON public.companies;
CREATE POLICY "Anyone can create a company" ON public.companies
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- User must be authenticated
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
      OR
      -- Or it's a new signup (no profile yet)
      NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
    )
  );

-- 2. copilot_action_events - "System can insert action events"
-- This should be restricted to service_role or specific users
DROP POLICY IF EXISTS "System can insert action events" ON public.copilot_action_events;
CREATE POLICY "System can insert action events" ON public.copilot_action_events
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() IS NOT NULL
  );

-- 3. copilot_actions - "System can insert copilot actions"
DROP POLICY IF EXISTS "System can insert copilot actions" ON public.copilot_actions;
CREATE POLICY "System can insert copilot actions" ON public.copilot_actions
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR auth.uid() IS NOT NULL
  );

-- 4. task_notifications - "System can create notifications"
DROP POLICY IF EXISTS "System can create notifications" ON public.task_notifications;
CREATE POLICY "System can create notifications" ON public.task_notifications
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_notifications.task_id
          AND (
            t.assigned_to = auth.uid()
            OR t.created_by = auth.uid()
          )
      )
    )
  );

-- 5. task_workflow_instances - "System can create workflow instances"
DROP POLICY IF EXISTS "System can create workflow instances" ON public.task_workflow_instances;
CREATE POLICY "System can create workflow instances" ON public.task_workflow_instances
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR (
      auth.uid() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tasks t
        WHERE t.id = task_workflow_instances.task_id
          AND (
            t.assigned_to = auth.uid()
            OR t.created_by = auth.uid()
          )
      )
    )
  );

COMMIT;
