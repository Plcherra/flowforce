-- Fix user registration issues

-- 1. Update RLS policy on user_roles to allow initial role assignment
DROP POLICY IF EXISTS "Users can manage their own roles" ON public.user_roles;

CREATE POLICY "Users can insert their own roles during registration" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all user roles" 
ON public.user_roles 
FOR ALL 
USING (is_admin_or_manager(auth.uid()));

-- 2. Create or replace the handle_new_user trigger function
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

-- 3. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Completely rewrite create_company_with_owner to work with existing users
-- Drop all variants of create_company_with_owner first
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'create_company_with_owner'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE',
                    func_record.proname,
                    func_record.args);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  user_email text, 
  user_password text, 
  user_first_name text, 
  user_last_name text, 
  company_data jsonb, 
  custom_roles jsonb DEFAULT '[]'::jsonb, 
  positions_data jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_user_id UUID;
  new_company_id UUID;
  role_record RECORD;
  position_record RECORD;
  new_role_id UUID;
  role_mapping JSONB := '{}'::jsonb;
  owner_role_id UUID;
  result JSONB;
BEGIN
  -- Get the current authenticated user (should already be signed up via Supabase Auth)
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to create a company';
  END IF;

  -- Update the user's profile with the provided information
  UPDATE public.profiles 
  SET 
    first_name = user_first_name,
    last_name = user_last_name,
    email = user_email
  WHERE id = current_user_id;

  -- Create the company
  INSERT INTO public.companies (
    name, industry, size, description, website, phone,
    primary_color, secondary_color, template_id, template_name,
    enabled_sections, custom_roles, positions, template_config,
    created_by, registration_complete
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
    current_user_id,
    true
  ) RETURNING id INTO new_company_id;

  -- Create owner role first (level 5 with full permissions)
  INSERT INTO public.company_roles (
    company_id, name, description, color, icon, 
    hierarchy_level, permissions, is_system_role, created_by
  ) VALUES (
    new_company_id,
    'Owner',
    'Company owner with full administrative privileges',
    '#dc2626',
    'Crown',
    5,
    jsonb_build_object(
      'viewAllProfiles', true,
      'editAllProfiles', true,
      'deleteProfiles', true,
      'manageRoles', true,
      'manageCompany', true,
      'managePayments', true,
      'manageInventory', true,
      'manageForms', true,
      'manageSchedules', true,
      'viewReports', true,
      'manageUsers', true,
      'systemAdmin', true
    ),
    true,
    current_user_id
  ) RETURNING id INTO owner_role_id;

  -- Create other custom roles
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
      current_user_id
    ) RETURNING id INTO new_role_id;
    
    role_mapping := role_mapping || jsonb_build_object(role_record.id, new_role_id);
  END LOOP;

  -- Create positions
  FOR position_record IN
    SELECT * FROM jsonb_to_recordset(positions_data) AS x(
      id TEXT, name TEXT, description TEXT, roleId TEXT, permissions JSONB
    )
  LOOP
    IF role_mapping ? position_record.roleId THEN
      INSERT INTO public.positions (
        name, description, role, permissions, department_id, role_id
      ) VALUES (
        position_record.name,
        COALESCE(position_record.description, ''),
        'employee',
        COALESCE(position_record.permissions, '{}'::jsonb),
        NULL,
        (role_mapping->>position_record.roleId)::UUID
      );
    END IF;
  END LOOP;

  -- Update the user's profile to link to the company and set as admin
  UPDATE public.profiles 
  SET 
    company_id = new_company_id, 
    is_company_admin = true,
    role = 'owner'
  WHERE id = current_user_id;

  -- Add user to owner role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (current_user_id, 'owner')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Return the created IDs
  result := jsonb_build_object(
    'user_id', current_user_id,
    'company_id', new_company_id,
    'owner_role_id', owner_role_id
  );

  RETURN result;
END;
$$;