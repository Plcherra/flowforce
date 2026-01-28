
-- Step 1: Fix Security Advisor Warnings
-- Fix mutable search_path, column reference errors, and optimize RLS policies

-- First, fix all SECURITY DEFINER functions with proper search_path
-- Drop all variants first to handle signature changes (adding DEFAULT)
-- Note: Functions with DEFAULT parameters are dropped using the parameter type, not DEFAULT keyword
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT role::TEXT FROM public.profiles WHERE id = user_uuid LIMIT 1);
END;
$$;

DROP FUNCTION IF EXISTS public.get_user_company_id(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (SELECT company_id FROM public.profiles WHERE id = user_uuid LIMIT 1);
END;
$$;

DROP FUNCTION IF EXISTS public.is_company_admin(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.is_company_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN COALESCE((SELECT is_company_admin FROM public.profiles WHERE id = user_uuid LIMIT 1), false);
END;
$$;

-- Fix the is_admin_or_manager function to use correct column reference
DROP FUNCTION IF EXISTS public.is_admin_or_manager(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.is_admin_or_manager(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role IN ('admin', 'manager', 'owner')
  );
END;
$$;

-- Fix has_role function with proper search_path
DROP FUNCTION IF EXISTS public.has_role(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(uuid, user_role) CASCADE;
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _user_id AND role::TEXT = _role
  );
END;
$$;

-- Update get_company_roles function with proper search_path
DROP FUNCTION IF EXISTS public.get_company_roles(uuid) CASCADE;
CREATE OR REPLACE FUNCTION public.get_company_roles(company_uuid UUID DEFAULT NULL)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  color TEXT,
  icon TEXT,
  hierarchy_level INTEGER,
  permissions JSONB,
  is_system_role BOOLEAN,
  is_active BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_company_id UUID;
BEGIN
  -- Get target company ID efficiently
  IF company_uuid IS NOT NULL THEN
    target_company_id := company_uuid;
  ELSE
    SELECT company_id INTO target_company_id 
    FROM public.profiles 
    WHERE id = auth.uid() 
    LIMIT 1;
  END IF;
  
  RETURN QUERY
  SELECT 
    cr.id,
    cr.name,
    cr.description,
    cr.color,
    cr.icon,
    cr.hierarchy_level,
    cr.permissions,
    cr.is_system_role,
    cr.is_active
  FROM public.company_roles cr
  WHERE cr.company_id = target_company_id
    AND cr.is_active = true
  ORDER BY cr.hierarchy_level ASC, cr.name ASC;
END;
$$;

-- Drop all existing overlapping policies on profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins and managers can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Company admins can update profiles" ON public.profiles;

-- Create consolidated, efficient RLS policies for profiles
CREATE POLICY "Profile access policy" 
  ON public.profiles 
  FOR SELECT 
  USING (
    -- Users can see their own profile OR profiles in their company
    id = auth.uid() OR 
    (company_id IS NOT NULL AND company_id = public.get_user_company_id())
  );

CREATE POLICY "Profile update policy" 
  ON public.profiles 
  FOR UPDATE 
  USING (
    -- Users can update their own profile OR company admins can update company profiles
    id = auth.uid() OR 
    (public.is_company_admin() AND company_id = public.get_user_company_id())
  );

CREATE POLICY "Profile management policy" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (public.is_company_admin() OR id = auth.uid());

-- Optimize other table policies to reduce RLS overhead
DROP POLICY IF EXISTS "Admins can manage analytics cache" ON public.analytics_cache;
CREATE POLICY "Analytics cache access" 
  ON public.analytics_cache 
  FOR ALL 
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- Optimize expense policies
DROP POLICY IF EXISTS "Users can view their expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can create expenses" ON public.expenses;
CREATE POLICY "Expense access policy" 
  ON public.expenses 
  FOR ALL 
  USING (
    employee_id = auth.uid() OR 
    created_by = auth.uid() OR 
    public.is_admin_or_manager(auth.uid())
  );

-- Add missing indexes for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_auth ON public.profiles(company_id, id) WHERE company_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_admin_flag ON public.profiles(is_company_admin, company_id) WHERE is_company_admin = true;
CREATE INDEX IF NOT EXISTS idx_company_roles_company_active ON public.company_roles(company_id, is_active) WHERE is_active = true;
