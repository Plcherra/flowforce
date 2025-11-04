-- Copilot foundation schema: shared queue, event log, and IDEA alignment tables

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.copilot_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  source text NOT NULL CHECK (source IN ('scenario', 'scheduler', 'guardrail', 'chat', 'performance', 'recognition', 'system')),
  action_type text NOT NULL,
  actor_user_id uuid REFERENCES public.profiles (id),
  actor_role text,
  target_type text,
  target_ref text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  evaluation jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendation jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'executing', 'completed', 'failed', 'skipped')),
  priority smallint NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  queued_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  dispatch_started_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (company_id, dedupe_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS copilot_actions_company_id_id_idx
  ON public.copilot_actions (company_id, id);

CREATE INDEX IF NOT EXISTS copilot_actions_company_dedupe_idx
  ON public.copilot_actions (company_id, dedupe_key);

CREATE INDEX IF NOT EXISTS copilot_actions_company_status_idx
  ON public.copilot_actions (company_id, status, priority, queued_at DESC);

ALTER TABLE public.copilot_actions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Copilot actions are company scoped"
  ON public.copilot_actions
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Copilot actions insert within tenant"
  ON public.copilot_actions
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Copilot actions mutate within tenant"
  ON public.copilot_actions
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Copilot actions delete within tenant"
  ON public.copilot_actions
  FOR DELETE
  USING (company_id = public.get_user_company_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER update_copilot_actions_updated_at
      BEFORE UPDATE ON public.copilot_actions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_copilot_actions_updated_at
      BEFORE UPDATE ON public.copilot_actions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.copilot_action_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  copilot_action_id uuid NOT NULL REFERENCES public.copilot_actions (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('queued', 'policy_denied', 'dispatch_started', 'dispatch_completed', 'dispatch_failed', 'evaluation_progress', 'evaluation_complete')),
  status text NOT NULL DEFAULT 'info' CHECK (status IN ('info', 'success', 'warning', 'error')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash text,
  actor_user_id uuid REFERENCES public.profiles (id),
  notes text,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (company_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS copilot_action_events_company_dedupe_idx
  ON public.copilot_action_events (company_id, dedupe_key);

CREATE INDEX IF NOT EXISTS copilot_action_events_action_idx
  ON public.copilot_action_events (copilot_action_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS copilot_action_events_company_event_type_idx
  ON public.copilot_action_events (company_id, event_type, occurred_at DESC);

ALTER TABLE public.copilot_action_events
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Copilot events readable within tenant"
  ON public.copilot_action_events
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Copilot events insert within tenant"
  ON public.copilot_action_events
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Copilot events mutate within tenant"
  ON public.copilot_action_events
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Copilot events delete within tenant"
  ON public.copilot_action_events
  FOR DELETE
  USING (company_id = public.get_user_company_id());

CREATE TABLE IF NOT EXISTS public.idea_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  title text NOT NULL,
  cycle_stage text NOT NULL DEFAULT 'discover' CHECK (cycle_stage IN ('discover', 'design', 'execute', 'analyze', 'archived')),
  owner_user_id uuid REFERENCES public.profiles (id),
  description text,
  focus_metrics jsonb NOT NULL DEFAULT '[]'::jsonb,
  hypotheses jsonb NOT NULL DEFAULT '[]'::jsonb,
  outcomes jsonb NOT NULL DEFAULT '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  kpi_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (company_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idea_cycles_company_dedupe_idx
  ON public.idea_cycles (company_id, dedupe_key);

CREATE INDEX IF NOT EXISTS idea_cycles_company_stage_idx
  ON public.idea_cycles (company_id, cycle_stage, starts_at DESC);

ALTER TABLE public.idea_cycles
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Idea cycles readable within tenant"
  ON public.idea_cycles
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Idea cycles insert within tenant"
  ON public.idea_cycles
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Idea cycles mutate within tenant"
  ON public.idea_cycles
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Idea cycles delete within tenant"
  ON public.idea_cycles
  FOR DELETE
  USING (company_id = public.get_user_company_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER update_idea_cycles_updated_at
      BEFORE UPDATE ON public.idea_cycles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_idea_cycles_updated_at
      BEFORE UPDATE ON public.idea_cycles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.idea_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies (id) ON DELETE CASCADE,
  idea_cycle_id uuid NOT NULL REFERENCES public.idea_cycles (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  stage text NOT NULL DEFAULT 'execute' CHECK (stage IN ('discover', 'design', 'execute', 'analyze')),
  action_type text NOT NULL,
  owner_user_id uuid REFERENCES public.profiles (id),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  due_at timestamptz,
  completed_at timestamptz,
  confidence numeric(5,2) CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (company_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idea_actions_company_dedupe_idx
  ON public.idea_actions (company_id, dedupe_key);

CREATE INDEX IF NOT EXISTS idea_actions_company_status_idx
  ON public.idea_actions (company_id, status, due_at);

ALTER TABLE public.idea_actions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Idea actions readable within tenant"
  ON public.idea_actions
  FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Idea actions insert within tenant"
  ON public.idea_actions
  FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Idea actions mutate within tenant"
  ON public.idea_actions
  FOR UPDATE
  USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Idea actions delete within tenant"
  ON public.idea_actions
  FOR DELETE
  USING (company_id = public.get_user_company_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at') THEN
    CREATE TRIGGER update_idea_actions_updated_at
      BEFORE UPDATE ON public.idea_actions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  ELSIF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE TRIGGER update_idea_actions_updated_at
      BEFORE UPDATE ON public.idea_actions
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE public.copilot_actions IS 'Queue of Copilot-evaluated actions ready for dispatch with tenant isolation.';
COMMENT ON TABLE public.copilot_action_events IS 'Event ledger for Copilot actions providing telemetry and auditing.';
COMMENT ON TABLE public.idea_cycles IS 'Business intelligence IDEA cycles aligned with Copilot recommendations.';
COMMENT ON TABLE public.idea_actions IS 'Executable actions within IDEA cycles sourced from Copilot.';
