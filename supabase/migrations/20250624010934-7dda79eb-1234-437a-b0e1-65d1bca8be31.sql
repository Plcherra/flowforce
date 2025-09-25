
-- Fix RLS policies by creating proper security definer functions and updating policies

-- Update the get_user_role function to be more robust
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

-- Create a function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(user_uuid UUID DEFAULT auth.uid())
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

-- Create a function to check if user is company admin
CREATE OR REPLACE FUNCTION public.is_company_admin(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(is_company_admin, false) FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

-- Drop existing problematic policies and recreate them properly
DROP POLICY IF EXISTS "Company members can view their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can update their company" ON public.companies;
DROP POLICY IF EXISTS "Company admins can manage invites" ON public.companies;
DROP POLICY IF EXISTS "Users can view their company roles" ON public.company_roles;
DROP POLICY IF EXISTS "Admins can manage company roles" ON public.company_roles;

-- Recreate company policies using security definer functions
CREATE POLICY "Company members can view their company" 
  ON public.companies 
  FOR SELECT 
  USING (id = public.get_user_company_id());

CREATE POLICY "Company admins can update their company" 
  ON public.companies 
  FOR UPDATE 
  USING (id = public.get_user_company_id() AND public.is_company_admin());

CREATE POLICY "Company admins can insert companies" 
  ON public.companies 
  FOR INSERT 
  WITH CHECK (public.is_company_admin());

-- Recreate company_roles policies
CREATE POLICY "Users can view their company roles" 
  ON public.company_roles 
  FOR SELECT 
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Company admins can manage company roles" 
  ON public.company_roles 
  FOR ALL 
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

-- Fix company invites policies
DROP POLICY IF EXISTS "Company admins can manage invites" ON public.company_invites;
DROP POLICY IF EXISTS "Invited users can view their invite" ON public.company_invites;

CREATE POLICY "Company admins can manage invites" 
  ON public.company_invites 
  FOR ALL 
  USING (company_id = public.get_user_company_id() AND public.is_company_admin());

CREATE POLICY "Invited users can view their invite" 
  ON public.company_invites 
  FOR SELECT 
  USING (email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Fix the get_company_roles function to work with the new structure
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
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
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
  WHERE cr.company_id = COALESCE(company_uuid, public.get_user_company_id())
    AND cr.is_active = true
  ORDER BY cr.hierarchy_level ASC, cr.name ASC;
$$;

-- Fix the create_company_with_setup function to properly create roles
CREATE OR REPLACE FUNCTION public.create_company_with_setup(
  company_data JSONB,
  custom_roles JSONB DEFAULT '[]'::jsonb,
  positions_data JSONB DEFAULT '[]'::jsonb,
  owner_user_id UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_company_id UUID;
  role_record RECORD;
  position_record RECORD;
  new_role_id UUID;
  role_mapping JSONB := '{}'::jsonb;
BEGIN
  -- Create the company
  INSERT INTO public.companies (
    name, industry, size, description, website, phone,
    primary_color, secondary_color, template_id, template_name,
    enabled_sections, custom_roles, positions, template_config,
    created_by
  ) VALUES (
    company_data->>'name',
    company_data->>'industry', 
    company_data->>'size',
    company_data->>'description',
    company_data->>'website',
    company_data->>'phone',
    COALESCE(company_data->>'primary_color', '#3b82f6'),
    COALESCE(company_data->>'secondary_color', '#1e40af'),
    company_data->>'template_id',
    company_data->>'template_name',
    COALESCE(company_data->'enabled_sections', '[]'::jsonb),
    custom_roles,
    positions_data,
    COALESCE(company_data->'template_config', '{}'::jsonb),
    owner_user_id
  ) RETURNING id INTO new_company_id;

  -- Create company roles from the custom_roles data
  FOR role_record IN 
    SELECT * FROM jsonb_to_recordset(custom_roles) AS x(
      id TEXT, name TEXT, description TEXT, color TEXT, 
      icon TEXT, hierarchy_level INTEGER, permissions JSONB, 
      is_system_role BOOLEAN
    )
  LOOP
    INSERT INTO public.company_roles (
      company_id, name, description, color, icon, 
      hierarchy_level, permissions, is_system_role, created_by
    ) VALUES (
      new_company_id,
      role_record.name,
      role_record.description,
      role_record.color,
      role_record.icon,
      role_record.hierarchy_level,
      COALESCE(role_record.permissions, '{}'::jsonb),
      COALESCE(role_record.is_system_role, false),
      owner_user_id
    ) RETURNING id INTO new_role_id;
    
    -- Store mapping for positions using the actual database ID
    role_mapping := role_mapping || jsonb_build_object(role_record.id, new_role_id);
  END LOOP;

  -- Create positions linked to the company roles
  FOR position_record IN
    SELECT * FROM jsonb_to_recordset(positions_data) AS x(
      id TEXT, name TEXT, description TEXT, roleId TEXT, permissions JSONB
    )
  LOOP
    -- Only create position if we have a valid role mapping
    IF role_mapping ? position_record.roleId THEN
      INSERT INTO public.positions (
        name, description, role, permissions, department_id, role_id
      ) VALUES (
        position_record.name,
        COALESCE(position_record.description, ''),
        'employee', -- Default role type
        COALESCE(position_record.permissions, '{}'::jsonb),
        NULL, -- Department will be assigned later
        (role_mapping->>position_record.roleId)::UUID
      );
    END IF;
  END LOOP;

  -- Update the owner's profile to link them to this company
  UPDATE public.profiles 
  SET company_id = new_company_id, is_company_admin = true
  WHERE id = owner_user_id;

  RETURN new_company_id;
END;
$$;
