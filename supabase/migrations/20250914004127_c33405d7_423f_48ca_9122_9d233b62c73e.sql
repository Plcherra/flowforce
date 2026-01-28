-- Fix function conflicts and security issues
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

-- Fix the existing function to set search_path properly
CREATE OR REPLACE FUNCTION get_user_company_id(user_uuid uuid DEFAULT auth.uid())
RETURNS UUID 
LANGUAGE plpgsql 
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN (SELECT company_id FROM public.profiles WHERE id = user_uuid LIMIT 1);
END;
$$;