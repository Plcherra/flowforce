-- Phase 4: Performance Optimization - Analytics RPC Endpoint
-- Date: January 22, 2026
-- Consolidates multiple analytics queries into a single RPC call

-- RPC Function: get_analytics_snapshot
-- Returns aggregated analytics metrics in a single call
CREATE OR REPLACE FUNCTION public.get_analytics_snapshot(
  p_company_id uuid,
  p_horizon_days integer DEFAULT 30,
  p_now timestamptz DEFAULT NOW()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_schedule_start timestamptz;
  v_schedule_end timestamptz;
  v_financial_start date;
  v_member_ids uuid[];
  v_result jsonb;
BEGIN
  -- Calculate date ranges
  v_schedule_start := p_now - interval '7 days';
  v_schedule_end := p_now + (p_horizon_days || ' days')::interval;
  v_financial_start := (p_now - interval '30 days')::date;

  -- Get company member IDs
  SELECT ARRAY_AGG(id) INTO v_member_ids
  FROM public.profiles
  WHERE company_id = p_company_id;

  -- If no members, return empty metrics
  IF v_member_ids IS NULL OR array_length(v_member_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'schedules', jsonb_build_object('total', 0, 'published', 0, 'drafts', 0, 'coverage', 0),
      'tasks', jsonb_build_object('total', 0, 'completed', 0, 'overdue', 0, 'in_progress', 0),
      'goals', jsonb_build_object('total', 0, 'completed', 0, 'in_progress', 0, 'on_track', 0),
      'transactions', jsonb_build_object('total', 0, 'amount', 0),
      'expenses', jsonb_build_object('total', 0, 'amount', 0, 'pending', 0)
    );
  END IF;

  -- Aggregate all analytics metrics in a single query
  SELECT jsonb_build_object(
    'schedules', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::integer,
        'published', COUNT(*) FILTER (WHERE is_published = true)::integer,
        'drafts', COUNT(*) FILTER (WHERE is_published = false OR is_published IS NULL)::integer,
        'coverage', COALESCE(
          ROUND(
            (COUNT(*)::numeric / GREATEST(
              (SELECT COUNT(*) FROM public.profiles WHERE company_id = p_company_id AND employment_status = 'active'),
              1
            ) * 5) * 100
          )::integer,
          0
        )
      )
      FROM public.schedules
      WHERE company_id = p_company_id
        AND start_time >= v_schedule_start
        AND start_time < v_schedule_end
    ),
    'tasks', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::integer,
        'completed', COUNT(*) FILTER (WHERE status = 'completed')::integer,
        'overdue', COUNT(*) FILTER (
          WHERE status != 'completed'
            AND due_date < p_now
        )::integer,
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress')::integer
      )
      FROM public.tasks
      WHERE company_id = p_company_id
    ),
    'goals', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::integer,
        'completed', COUNT(*) FILTER (WHERE status = 'completed')::integer,
        'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress')::integer,
        'on_track', COUNT(*) FILTER (
          WHERE status = 'in_progress'
            AND progress >= 50
        )::integer
      )
      FROM public.goals
      WHERE company_id = p_company_id
    ),
    'transactions', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::integer,
        'amount', COALESCE(SUM(total_amount), 0)::numeric
      )
      FROM public.inventory_transactions
      WHERE performed_by = ANY(v_member_ids)
        AND created_at >= v_financial_start
    ),
    'expenses', (
      SELECT jsonb_build_object(
        'total', COUNT(*)::integer,
        'amount', COALESCE(SUM(amount), 0)::numeric,
        'pending', COUNT(*) FILTER (WHERE status = 'pending')::integer
      )
      FROM public.expenses
      WHERE created_by = ANY(v_member_ids)
        AND expense_date >= v_financial_start
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_analytics_snapshot(uuid, integer, timestamptz) TO authenticated;

-- Comment for documentation
COMMENT ON FUNCTION public.get_analytics_snapshot(uuid, integer, timestamptz) IS 
'P0: Aggregates analytics metrics in a single RPC call. Replaces multiple count(*) queries with one optimized call. Returns JSONB with schedules, tasks, goals, transactions, and expenses metrics.';
