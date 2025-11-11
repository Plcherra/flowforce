-- Fix the infinite recursion in RLS policies for companies table
-- First, temporarily disable RLS to make updates
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Drop problematic policies that cause recursion
DROP POLICY IF EXISTS "Company admins can manage their company" ON companies;
DROP POLICY IF EXISTS "Company members can view basic company info" ON companies;

-- Create safer policies that don't cause recursion
CREATE POLICY "Users can view their own company" 
ON companies FOR SELECT 
USING (created_by = auth.uid() OR owner_id = auth.uid());

CREATE POLICY "Company owners can update their company" 
ON companies FOR UPDATE 
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Re-enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Also fix search path issues for functions
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