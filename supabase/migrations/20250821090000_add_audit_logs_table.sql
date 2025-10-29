-- Ensure audit logging infrastructure exists and captures key profile events
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID NULL,
  old_values JSONB NULL,
  new_values JSONB NULL,
  performed_by UUID NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.audit_logs IS 'Stores security-sensitive user audit events (role changes, status updates, overrides, etc).';

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_logs'
      AND policyname = 'Admins can view audit logs'
  ) THEN
    CREATE POLICY "Admins can view audit logs" ON public.audit_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('admin', 'owner')
        )
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs (performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Recreate the audit logging trigger to capture role & employment status changes
DROP TRIGGER IF EXISTS profile_role_change_audit ON public.profiles;

DROP FUNCTION IF EXISTS public.log_role_change();

CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor UUID := auth.uid();
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      performed_by
    )
    VALUES (
      NEW.id,
      'profile.role_changed',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('role', OLD.role::text),
      jsonb_build_object('role', NEW.role::text),
      actor
    );
  END IF;

  IF OLD.employment_status IS DISTINCT FROM NEW.employment_status THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      performed_by
    )
    VALUES (
      NEW.id,
      'profile.status_changed',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('employment_status', OLD.employment_status::text),
      jsonb_build_object('employment_status', NEW.employment_status::text),
      actor
    );
  END IF;

  IF OLD.role_id IS DISTINCT FROM NEW.role_id THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      performed_by
    )
    VALUES (
      NEW.id,
      'profile.role_template_changed',
      TG_TABLE_NAME,
      NEW.id,
      jsonb_build_object('role_id', OLD.role_id),
      jsonb_build_object('role_id', NEW.role_id),
      actor
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profile_role_change_audit
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_role_change();

-- Helper RPC for recording additional audit entries from the application
DROP FUNCTION IF EXISTS public.log_audit_event(UUID, TEXT, TEXT, UUID, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.log_audit_event(
  target_user_id UUID DEFAULT NULL,
  event_action TEXT,
  target_table TEXT,
  target_record_id UUID DEFAULT NULL,
  previous_values JSONB DEFAULT NULL,
  next_values JSONB DEFAULT NULL
)
RETURNS public.audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  actor UUID := auth.uid();
  actor_role public.user_role;
  inserted_row public.audit_logs;
BEGIN
  IF event_action IS NULL OR target_table IS NULL THEN
    RAISE EXCEPTION 'event_action and target_table cannot be null';
  END IF;

  IF actor IS NULL THEN
    RAISE EXCEPTION 'log_audit_event requires an authenticated user';
  END IF;

  SELECT role INTO actor_role
  FROM public.profiles
  WHERE id = actor;

  -- Allow service role (no profile) or admin/owner users to write audit entries
  IF actor_role IS NULL THEN
    -- No profile found: allow insertion (service role usage)
    NULL;
  ELSIF actor_role NOT IN ('admin', 'owner', 'manager') THEN
    RAISE EXCEPTION 'Insufficient permissions to create audit entry';
  END IF;

  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_values,
    new_values,
    performed_by
  )
  VALUES (
    target_user_id,
    event_action,
    target_table,
    target_record_id,
    previous_values,
    next_values,
    actor
  )
  RETURNING * INTO inserted_row;

  RETURN inserted_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, TEXT, TEXT, UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(UUID, TEXT, TEXT, UUID, JSONB, JSONB) TO service_role;
