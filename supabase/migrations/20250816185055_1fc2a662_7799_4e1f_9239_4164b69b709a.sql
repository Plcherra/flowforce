-- Fix user registration issues (clean slate)

-- 1. Drop all existing policies on user_roles
DROP POLICY IF EXISTS "Users can insert their own roles during registration" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user roles" ON public.user_roles;

-- 2. Create new policies for user_roles
CREATE POLICY "Users can insert own roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins manage all roles" 
ON public.user_roles 
FOR ALL 
USING (is_admin_or_manager(auth.uid()));

-- 3. Fix the handle_new_user trigger function
-- Drop all variants of handle_new_user first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    first_name, 
    last_name, 
    employee_id, 
    role, 
    employment_status
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', 'New'),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', 'User'),
    'EMP-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((EXTRACT(EPOCH FROM now()) % 10000)::TEXT, 4, '0'),
    'staff',
    'active'
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;