-- Fix function conflicts and security issues
-- Drop the duplicate get_user_company_id function without parameters
DROP FUNCTION IF EXISTS get_user_company_id();

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