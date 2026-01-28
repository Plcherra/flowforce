-- Migration: 20250619015306_create_company_roles_and_permissions.sql
-- Purpose: Create company_roles and role_permissions + safe get_user_role rename

-- 1. Drop dependent policies
DROP POLICY IF EXISTS "Managers can view team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Managers can update team profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

-- 2. Drop all variants of get_user_role (handle different signatures)
-- Note: PostgreSQL function signatures don't include DEFAULT in the signature,
-- so we drop by name pattern and let CASCADE handle dependencies
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Find and drop all variants of get_user_role
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_role'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                    func_record.proname, 
                    func_record.args);
  END LOOP;
END $$;

-- 3. Create/replace get_user_role (use user_id parameter name to match earlier migration)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT role::TEXT 
  FROM public.profiles 
  WHERE id = user_id 
  LIMIT 1;
$$;

-- 4. Recreate policies for profiles (simplified) - DROP first to avoid conflicts
DROP POLICY IF EXISTS "Managers can view team profiles" ON public.profiles;
CREATE POLICY "Managers can view team profiles"
  ON public.profiles FOR SELECT
  USING (public.get_user_role(auth.uid()) IN ('manager', 'admin', 'owner'));

DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

-- 5. company_roles table
CREATE TABLE IF NOT EXISTS public.company_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID, -- Allow NULL initially, will be set by foreign key later
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'Users',
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Add foreign key constraint if companies table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'companies'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'company_roles_company_id_fkey'
    AND table_name = 'company_roles'
  ) THEN
    ALTER TABLE public.company_roles 
    ADD CONSTRAINT company_roles_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.company_roles ENABLE ROW LEVEL SECURITY;

-- 6. Policies for company_roles (permissive for local) - DROP first to avoid conflicts
DROP POLICY IF EXISTS "Users can view company roles" ON public.company_roles;
CREATE POLICY "Users can view company roles"
  ON public.company_roles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins and owners manage company roles" ON public.company_roles;
CREATE POLICY "Admins and owners manage company roles"
  ON public.company_roles FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

-- 7. role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.company_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  permission_value BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(role_id, permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View role permissions" ON public.role_permissions;
CREATE POLICY "View role permissions"
  ON public.role_permissions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Manage role permissions" ON public.role_permissions;
CREATE POLICY "Manage role permissions"
  ON public.role_permissions FOR ALL
  USING (public.get_user_role(auth.uid()) IN ('admin', 'owner'))
  WITH CHECK (public.get_user_role(auth.uid()) IN ('admin', 'owner'));

-- 8. Seed default roles (with explicit integer cast)
-- Only seed if company_settings table exists and has data
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings'
  ) AND EXISTS (SELECT 1 FROM public.company_settings LIMIT 1) THEN
    INSERT INTO public.company_roles (
      company_id, name, description, color, icon, hierarchy_level, is_system_role, is_active
    )
    SELECT 
      cs.id,
      r.name,
      r.description,
      r.color,
      r.icon,
      r.hierarchy_level,
      true,
      true
    FROM public.company_settings cs
    CROSS JOIN (VALUES
      ('staff',      'Staff',      '#6b7280', 'Users',      1::integer),
      ('supervisor', 'Supervisor', '#10b981', 'UserCheck',  2::integer),
      ('manager',    'Manager',    '#3b82f6', 'Shield',     3::integer),
      ('admin',      'Admin',      '#ef4444', 'Crown',      4::integer),
      ('owner',      'Owner',      '#8b5cf6', 'Star',       5::integer)
    ) AS r(name, description, color, icon, hierarchy_level)
    ON CONFLICT (company_id, name) DO NOTHING;
  END IF;
END $$;

-- 9. get_company_roles function - DROP first to handle signature changes
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Find and drop all variants of get_company_roles
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_company_roles'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                    func_record.proname, 
                    func_record.args);
  END LOOP;
END $$;
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
SET search_path = public, auth
AS $$
DECLARE
  target_company_id UUID;
BEGIN
  IF company_uuid IS NOT NULL THEN
    target_company_id := company_uuid;
  ELSIF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'company_settings'
  ) THEN
    SELECT id INTO target_company_id FROM public.company_settings LIMIT 1;
  ELSIF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'companies'
  ) THEN
    SELECT id INTO target_company_id FROM public.companies LIMIT 1;
  END IF;
  
  RETURN QUERY
  SELECT 
    cr.id, cr.name, cr.description, cr.color, cr.icon,
    cr.hierarchy_level, cr.permissions, cr.is_system_role, cr.is_active
  FROM public.company_roles cr
  WHERE cr.is_active = true
    AND (target_company_id IS NULL OR cr.company_id = target_company_id)
  ORDER BY cr.hierarchy_level ASC, cr.name ASC;
END;
$$;

-- 10. Trigger (only create if update_updated_at function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'update_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS update_company_roles_updated_at ON public.company_roles;
    CREATE TRIGGER update_company_roles_updated_at
      BEFORE UPDATE ON public.company_roles
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at();
  END IF;
END $$;