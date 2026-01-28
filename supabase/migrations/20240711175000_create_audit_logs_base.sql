-- Create base audit log infrastructure for the employee directory
-- Ensures the table exists even when feature flag is disabled in the UI

-- Audit table definition (idempotent)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable row level security and ensure viewer policy exists
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only create policy if profiles table exists and has role column
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) AND EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'role'
  ) THEN
    DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
    CREATE POLICY "Admins can view audit logs" ON public.audit_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM public.profiles
          WHERE id = auth.uid()
            AND role::text IN ('admin', 'owner')
        )
      );
  END IF;
END $$;

-- Ensure helper function and trigger for role change auditing exist
CREATE OR REPLACE FUNCTION public.log_role_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only record entries when the role actually changes
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    INSERT INTO public.audit_logs (
      user_id,
      action,
      table_name,
      record_id,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      NEW.id,
      'role_change',
      'profiles',
      NEW.id,
      jsonb_build_object('role', OLD.role),
      jsonb_build_object('role', NEW.role),
      auth.uid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only create trigger if profiles table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    DROP TRIGGER IF EXISTS profile_role_change_audit ON public.profiles;
    CREATE TRIGGER profile_role_change_audit
      AFTER UPDATE ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.log_role_change();
  END IF;
END $$;

-- Supporting indexes (created once)
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
