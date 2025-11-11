
-- Only update role column type if it exists and is different
DO $$
BEGIN
  -- Check if role column exists and update if needed
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role' AND table_schema = 'public') THEN
    -- Create new enum type with all roles
    CREATE TYPE public.app_role_new AS ENUM ('staff', 'supervisor', 'manager', 'admin', 'owner');
    
    -- Update the column type
    ALTER TABLE public.profiles ALTER COLUMN role TYPE public.app_role_new USING role::text::public.app_role_new;
    
    -- Drop old type and rename new one
    DROP TYPE IF EXISTS public.user_role CASCADE;
    ALTER TYPE public.app_role_new RENAME TO user_role;
  ELSE
    -- Create enum and add column if it doesn't exist
    CREATE TYPE public.user_role AS ENUM ('staff', 'supervisor', 'manager', 'admin', 'owner');
    ALTER TABLE public.profiles ADD COLUMN role public.user_role NOT NULL DEFAULT 'staff';
  END IF;
  
  -- Add team_id if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'team_id' AND table_schema = 'public') THEN
    ALTER TABLE public.profiles ADD COLUMN team_id UUID REFERENCES public.departments(id);
  END IF;
END $$;

-- Create security definer functions for role checking
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS public.user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_user(manager_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p1, public.profiles p2
    WHERE p1.id = manager_id 
    AND p2.id = target_user_id
    AND (
      p1.role IN ('admin', 'owner') OR
      (p1.role = 'manager' AND p2.team_id = p1.team_id) OR
      (p1.role = 'supervisor' AND p2.team_id = p1.team_id AND p2.role = 'staff')
    )
  );
$$;

-- Update RLS policies for profiles (drop and recreate to ensure consistency)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- New RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Managers can view team profiles" ON public.profiles
  FOR SELECT USING (
    public.get_user_role(auth.uid()) IN ('manager', 'admin', 'owner') OR
    (public.get_user_role(auth.uid()) = 'supervisor' AND team_id = (SELECT team_id FROM public.profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers can update team profiles" ON public.profiles
  FOR UPDATE USING (public.can_manage_user(auth.uid(), id));

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

-- Create audit log table for tracking role changes if it doesn't exist
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_values JSONB,
  new_values JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
  FOR SELECT USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));
