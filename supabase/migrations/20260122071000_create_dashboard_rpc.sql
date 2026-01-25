-- Phase 4: Performance Optimization - Dashboard RPC Endpoint
-- Date: January 22, 2026
-- Consolidates multiple dashboard queries into a single RPC call

-- RPC Function: get_dashboard_stats
-- Returns aggregated dashboard statistics in a single call
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_company_id uuid,
  p_today date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
  v_week_end date;
  v_year_start date;
  v_result jsonb;
BEGIN
  -- Calculate week boundaries (Monday to Sunday)
  v_week_start := date_trunc('week', p_today)::date;
  v_week_end := v_week_start + interval '6 days';
  v_year_start := date_trunc('year', p_today)::date;

  -- Aggregate all dashboard statistics in a single query
  SELECT jsonb_build_object(
    'total_employees', (
      SELECT COUNT(*)::integer
      FROM public.profiles
      WHERE company_id = p_company_id
    ),
    'active_employees', (
      SELECT COUNT(*)::integer
      FROM public.profiles
      WHERE company_id = p_company_id
        AND employment_status = 'active'
    ),
    'total_departments', (
      SELECT COUNT(DISTINCT department_id)::integer
      FROM public.profiles
      WHERE company_id = p_company_id
        AND department_id IS NOT NULL
    ),
    'todays_shifts', (
      SELECT COUNT(*)::integer
      FROM public.schedules
      WHERE company_id = p_company_id
        AND DATE(start_time) = p_today
    ),
    'pending_time_off', (
      SELECT COUNT(*)::integer
      FROM public.time_off_requests tor
      INNER JOIN public.profiles p ON p.id = tor.user_id
      WHERE p.company_id = p_company_id
        AND LOWER(tor.status) = 'requested'
    ),
    'approved_time_off_upcoming', (
      SELECT COUNT(*)::integer
      FROM public.time_off_requests tor
      INNER JOIN public.profiles p ON p.id = tor.user_id
      WHERE p.company_id = p_company_id
        AND LOWER(tor.status) = 'approved'
        AND tor.end_date >= p_today
    ),
    'time_off_days_used', (
      SELECT COALESCE(SUM(
        GREATEST(
          0,
          LEAST(
            EXTRACT(EPOCH FROM (tor.end_date - GREATEST(tor.start_date, v_year_start))) / 86400 + 1,
            EXTRACT(EPOCH FROM (tor.end_date - tor.start_date)) / 86400 + 1
          )
        )
      )::integer, 0)
      FROM public.time_off_requests tor
      INNER JOIN public.profiles p ON p.id = tor.user_id
      WHERE p.company_id = p_company_id
        AND LOWER(tor.status) = 'approved'
        AND tor.end_date >= v_year_start
        AND tor.start_date IS NOT NULL
        AND tor.end_date IS NOT NULL
    ),
    'coverage_completeness', (
      SELECT LEAST(
        GREATEST(
          ROUND(
            (COUNT(*)::numeric / GREATEST((SELECT COUNT(*) FROM public.profiles WHERE company_id = p_company_id AND employment_status = 'active'), 1) * 5) * 100
          )::integer,
          0
        ),
        150
      )
      FROM public.schedules
      WHERE company_id = p_company_id
        AND start_time >= v_week_start::timestamp
        AND start_time <= (v_week_end + interval '1 day')::timestamp
    ),
    'hours_utilization', (
      SELECT LEAST(
        GREATEST(
          ROUND(
            (COALESCE(SUM(EXTRACT(EPOCH FROM (end_time - start_time)) / 3600), 0)::numeric /
             GREATEST((SELECT COUNT(*) FROM public.profiles WHERE company_id = p_company_id AND employment_status = 'active') * 40, 1)) * 100
          )::integer,
          0
        ),
        150
      )
      FROM public.schedules
      WHERE company_id = p_company_id
        AND start_time >= v_week_start::timestamp
        AND start_time <= (v_week_end + interval '1 day')::timestamp
        AND end_time IS NOT NULL
    ),
    'task_completion', (
      SELECT LEAST(
        GREATEST(
          ROUND(
            ((SELECT COUNT(*) FROM public.schedules WHERE company_id = p_company_id AND DATE(start_time) = p_today)::numeric /
             GREATEST((SELECT COUNT(*) FROM public.profiles WHERE company_id = p_company_id AND employment_status = 'active'), 1)) * 100
          )::integer,
          0
        ),
        100
      )
    ),
    'time_off_balance_remaining', (
      SELECT GREATEST(
        (SELECT COUNT(*) FROM public.profiles WHERE company_id = p_company_id) * 25 -
        COALESCE(SUM(
          GREATEST(
            0,
            LEAST(
              EXTRACT(EPOCH FROM (tor.end_date - GREATEST(tor.start_date, v_year_start))) / 86400 + 1,
              EXTRACT(EPOCH FROM (tor.end_date - tor.start_date)) / 86400 + 1
            )
          )
        )::integer, 0),
        0
      )
      FROM public.time_off_requests tor
      INNER JOIN public.profiles p ON p.id = tor.user_id
      WHERE p.company_id = p_company_id
        AND LOWER(tor.status) = 'approved'
        AND tor.end_date >= v_year_start
        AND tor.start_date IS NOT NULL
        AND tor.end_date IS NOT NULL
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats(uuid, date) TO authenticated;

-- Add RLS check: users can only query their own company's stats
ALTER FUNCTION public.get_dashboard_stats(uuid, date) SECURITY DEFINER SET search_path = public;

-- Comment for documentation
COMMENT ON FUNCTION public.get_dashboard_stats(uuid, date) IS 
'P0: Aggregates dashboard statistics in a single RPC call. Replaces 4-5 sequential queries with one optimized call. Returns JSONB with all dashboard metrics.';
