
-- Only update role column type if it exists and is different
-- This migration is idempotent and safe to skip if profiles table doesn't exist yet
DO $$
BEGIN
  -- Check if profiles table exists first
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Check if role column exists and update if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role' AND table_schema = 'public') THEN
      -- Check if we need to change the type (only if current type is different)
      -- Skip type change if user_role enum already exists - let later migrations handle it
      -- This avoids conflicts with existing policies and data
      NULL;
    ELSE
      -- Create enum and add column if it doesn't exist
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE public.user_role AS ENUM ('staff', 'supervisor', 'manager', 'admin', 'owner');
      END IF;
      ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role public.user_role NOT NULL DEFAULT 'staff';
    END IF;
    
    -- Add team_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'team_id' AND table_schema = 'public') THEN
      ALTER TABLE public.profiles ADD COLUMN team_id UUID REFERENCES public.departments(id);
    END IF;
  END IF;
END $$;

-- Create security definer functions for role checking (only if profiles table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Create functions (use $func$ delimiter to avoid conflicts)
    EXECUTE 'CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
    RETURNS TEXT
    LANGUAGE SQL
    STABLE
    SECURITY DEFINER
    AS $func$
      SELECT role::text FROM public.profiles WHERE id = user_id;
    $func$;';

    EXECUTE 'CREATE OR REPLACE FUNCTION public.can_manage_user(manager_id UUID, target_user_id UUID)
    RETURNS BOOLEAN
    LANGUAGE SQL
    STABLE
    SECURITY DEFINER
    AS $func$
      SELECT EXISTS (
        SELECT 1 FROM public.profiles p1, public.profiles p2
        WHERE p1.id = manager_id 
        AND p2.id = target_user_id
        AND (
          p1.role::text IN (''admin'', ''owner'') OR
          (p1.role::text = ''manager'' AND p2.team_id = p1.team_id) OR
          (p1.role::text = ''supervisor'' AND p2.team_id = p1.team_id AND p2.role::text = ''staff'')
        )
      );
    $func$;';

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

    -- Update audit log policy if table exists
    IF EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'audit_logs'
    ) THEN
      DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
      CREATE POLICY "Admins can view audit logs" ON public.audit_logs
        FOR SELECT USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));
    END IF;
  END IF;
END $$;
