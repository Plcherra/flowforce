-- Migration: Create Employee Enrichment RPC
-- Purpose: Consolidate multiple employee enrichment queries into a single RPC call
-- Date: 2026-01-22

-- RPC function to fetch employee enrichment data (skills, badges, reports, attendance)
-- This replaces 4 separate queries with a single optimized call
CREATE OR REPLACE FUNCTION public.get_employee_enrichment(
  p_company_id uuid,
  p_employee_ids uuid[],
  p_lookback_date date DEFAULT (CURRENT_DATE - INTERVAL '30 days')
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Validate inputs
  IF p_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;

  IF p_employee_ids IS NULL OR array_length(p_employee_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'skills', jsonb_build_array(),
      'badges', jsonb_build_array(),
      'reports', jsonb_build_array(),
      'attendance', jsonb_build_array()
    );
  END IF;

  -- Build consolidated result with all enrichment data
  SELECT jsonb_build_object(
    'skills', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'employee_id', sm.employee_id,
          'level', sm.level,
          'xp', sm.xp,
          'role', sm.role,
          'last_review', sm.last_review,
          'created_at', sm.created_at,
          'updated_at', sm.updated_at
        )
      )
      FROM skill_matrix sm
      WHERE sm.employee_id = ANY(p_employee_ids)
      ),
      jsonb_build_array()
    ),
    'badges', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'employee_id', eb.employee_id,
          'badge_code', eb.badge_code,
          'awarded_at', eb.awarded_at,
          'awarded_by', eb.awarded_by,
          'reason', eb.reason,
          'created_at', eb.created_at
        )
      )
      FROM employee_badge eb
      WHERE eb.employee_id = ANY(p_employee_ids)
      ),
      jsonb_build_array()
    ),
    'reports', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'employee_id', er.employee_id,
          'id', er.id,
          'date', er.date,
          'category', er.category,
          'severity', er.severity,
          'notes', er.notes,
          'created_by', er.created_by,
          'created_at', er.created_at,
          'updated_at', er.updated_at
        )
      )
      FROM employee_report er
      WHERE er.employee_id = ANY(p_employee_ids)
        AND er.date >= p_lookback_date
      ),
      jsonb_build_array()
    ),
    'attendance', COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'user_id', sp.user_id,
          'date', sp.date,
          'attendance_status', sp.attendance_status,
          'role', sp.role,
          'hours_worked', sp.hours_worked,
          'created_at', sp.created_at
        )
      )
      FROM staff_performance sp
      WHERE sp.user_id = ANY(p_employee_ids)
        AND sp.date >= p_lookback_date
      ),
      jsonb_build_array()
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.get_employee_enrichment IS 'Consolidates employee enrichment queries (skills, badges, reports, attendance) into a single RPC call for performance optimization';
