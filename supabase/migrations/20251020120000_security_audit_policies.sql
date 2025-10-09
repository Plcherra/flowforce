-- Security policies and audit triggers for availability and gamification workflows

-- Ensure required tables have RLS enabled
ALTER TABLE public.org_prefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_badge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_proposal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- org_prefs policies (lock mode management)
-- ====================================================================
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

-- ====================================================================
-- availability_request policies
-- ====================================================================
DROP POLICY IF EXISTS "Availability requests readable" ON public.availability_request;
CREATE POLICY "Availability requests readable" ON public.availability_request
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Availability requests insert" ON public.availability_request;
CREATE POLICY "Availability requests insert" ON public.availability_request
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND employee_id = auth.uid()
    AND status = 'pending'
    AND manager_id IS NULL
  );

DROP POLICY IF EXISTS "Availability requests update employees" ON public.availability_request;
CREATE POLICY "Availability requests update employees" ON public.availability_request
  FOR UPDATE
  USING (employee_id = auth.uid())
  WITH CHECK (
    employee_id = auth.uid()
    AND status = 'pending'
    AND manager_id IS NULL
  );

DROP POLICY IF EXISTS "Availability requests update managers" ON public.availability_request;
CREATE POLICY "Availability requests update managers" ON public.availability_request
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
    AND manager_id = auth.uid()
  );

DROP POLICY IF EXISTS "Availability requests delete" ON public.availability_request;
CREATE POLICY "Availability requests delete" ON public.availability_request
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

-- ====================================================================
-- employee_badge policies
-- ====================================================================
DROP POLICY IF EXISTS "Employee badges readable" ON public.employee_badge;
CREATE POLICY "Employee badges readable" ON public.employee_badge
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Employee badges insert" ON public.employee_badge;
CREATE POLICY "Employee badges insert" ON public.employee_badge
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
    AND awarded_by = auth.uid()
  );

DROP POLICY IF EXISTS "Employee badges update" ON public.employee_badge;
CREATE POLICY "Employee badges update" ON public.employee_badge
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

DROP POLICY IF EXISTS "Employee badges delete" ON public.employee_badge;
CREATE POLICY "Employee badges delete" ON public.employee_badge
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

-- ====================================================================
-- promotion_proposal policies
-- ====================================================================
DROP POLICY IF EXISTS "Promotion proposals readable" ON public.promotion_proposal;
CREATE POLICY "Promotion proposals readable" ON public.promotion_proposal
  FOR SELECT
  USING (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Promotion proposals insert" ON public.promotion_proposal;
CREATE POLICY "Promotion proposals insert" ON public.promotion_proposal
  FOR INSERT
  WITH CHECK (
    employee_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Promotion proposals update" ON public.promotion_proposal;
CREATE POLICY "Promotion proposals update" ON public.promotion_proposal
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

-- ====================================================================
-- audit_log policies
-- ====================================================================
DROP POLICY IF EXISTS "Audit log readable" ON public.audit_log;
CREATE POLICY "Audit log readable" ON public.audit_log
  FOR SELECT
  USING (
    actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('manager', 'owner', 'company_admin', 'admin')
    )
  );

DROP POLICY IF EXISTS "Audit log insertable" ON public.audit_log;
CREATE POLICY "Audit log insertable" ON public.audit_log
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND actor_id = auth.uid()
  );

-- ====================================================================
-- Audit trigger functions
-- ====================================================================
CREATE OR REPLACE FUNCTION public.audit_lock_mode_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Audit actor is null';
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, meta)
  VALUES (
    actor,
    'org_prefs.lock_mode_updated',
    'org_prefs',
    NEW.id,
    jsonb_build_object(
      'field', 'availability_lock_mode',
      'old_value', OLD.availability_lock_mode,
      'new_value', NEW.availability_lock_mode
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS org_prefs_lock_mode_audit ON public.org_prefs;
CREATE TRIGGER org_prefs_lock_mode_audit
  AFTER UPDATE ON public.org_prefs
  FOR EACH ROW
  WHEN (OLD.availability_lock_mode IS DISTINCT FROM NEW.availability_lock_mode)
  EXECUTE FUNCTION public.audit_lock_mode_change();

CREATE OR REPLACE FUNCTION public.audit_availability_request_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Audit actor is null';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (actor_id, action, entity, entity_id, meta)
    VALUES (
      actor,
      'availability_request.status_changed',
      'availability_request',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'manager_id', NEW.manager_id,
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS availability_request_audit ON public.availability_request;
CREATE TRIGGER availability_request_audit
  AFTER UPDATE ON public.availability_request
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.audit_availability_request_change();

CREATE OR REPLACE FUNCTION public.audit_employee_badge_award()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor uuid := COALESCE(auth.uid(), NEW.awarded_by);
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Audit actor is null';
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, meta)
  VALUES (
    actor,
    'employee_badge.awarded',
    'employee_badge',
    NEW.id,
    jsonb_build_object(
      'employee_id', NEW.employee_id,
      'badge_code', NEW.badge_code,
      'reason', NEW.reason
    )
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS employee_badge_audit ON public.employee_badge;
CREATE TRIGGER employee_badge_audit
  AFTER INSERT ON public.employee_badge
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_employee_badge_award();

CREATE OR REPLACE FUNCTION public.audit_promotion_proposal_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF actor IS NULL THEN
    RAISE EXCEPTION 'Audit actor is null';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_log (actor_id, action, entity, entity_id, meta)
    VALUES (
      actor,
      'promotion_proposal.status_changed',
      'promotion_proposal',
      NEW.id,
      jsonb_build_object(
        'employee_id', NEW.employee_id,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'proposed_role', NEW.proposed_role,
        'proposed_level', NEW.proposed_level
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS promotion_proposal_audit ON public.promotion_proposal;
CREATE TRIGGER promotion_proposal_audit
  AFTER UPDATE ON public.promotion_proposal
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.audit_promotion_proposal_change();
