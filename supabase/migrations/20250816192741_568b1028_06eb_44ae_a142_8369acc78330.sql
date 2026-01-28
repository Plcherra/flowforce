-- Fix the infinite recursion in RLS policies for companies table
-- First, temporarily disable RLS to make updates
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Company admins can manage their company" ON companies;
DROP POLICY IF EXISTS "Company members can view basic company info" ON companies;

-- Create safer policies that don't cause recursion
-- Note: owner_id column may not exist yet (added in later migration), so we check for it conditionally
DO $$
BEGIN
  -- Check if owner_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'companies' 
    AND column_name = 'owner_id'
  ) THEN
    -- owner_id exists, use it
    DROP POLICY IF EXISTS "Users can view their own company" ON companies;
    EXECUTE 'CREATE POLICY "Users can view their own company" 
      ON companies FOR SELECT 
      USING (created_by = auth.uid() OR owner_id = auth.uid())';
    
    DROP POLICY IF EXISTS "Company owners can update their company" ON companies;
    EXECUTE 'CREATE POLICY "Company owners can update their company" 
      ON companies FOR UPDATE 
      USING (owner_id = auth.uid())
      WITH CHECK (owner_id = auth.uid())';
  ELSE
    -- owner_id doesn't exist yet, use created_by only
    DROP POLICY IF EXISTS "Users can view their own company" ON companies;
    CREATE POLICY "Users can view their own company" 
    ON companies FOR SELECT 
    USING (created_by = auth.uid());
    
    DROP POLICY IF EXISTS "Company owners can update their company" ON companies;
    CREATE POLICY "Company owners can update their company" 
    ON companies FOR UPDATE 
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());
  END IF;
END $$;

-- Re-enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Also fix search path issues for functions
-- Drop all variants of get_user_company_id first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_company_id'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN (SELECT company_id FROM public.profiles WHERE id = user_uuid LIMIT 1);
END;
$function$;

-- Drop all variants of is_company_admin first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_company_admin'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_company_admin(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN COALESCE((SELECT is_company_admin FROM public.profiles WHERE id = user_uuid LIMIT 1), false);
END;
$function$;

-- Drop all variants of has_role first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'has_role'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role::TEXT = _role
  );
END;
$function$;

-- Drop all variants of is_admin_or_manager first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'is_admin_or_manager'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role IN ('admin', 'manager', 'owner')
  );
END;
$function$;