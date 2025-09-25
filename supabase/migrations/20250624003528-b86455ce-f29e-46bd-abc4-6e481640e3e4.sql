
-- Fix the positions table to work with the onboarding system
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES public.company_roles(id);

-- Create a function to properly handle company creation with roles and positions
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
      role_record.permissions,
      COALESCE(role_record.is_system_role, false),
      owner_user_id
    );
    
    -- Store mapping for positions
    role_mapping := role_mapping || jsonb_build_object(role_record.id, currval('company_roles_id_seq'));
  END LOOP;

  -- Create positions linked to the company roles
  FOR position_record IN
    SELECT * FROM jsonb_to_recordset(positions_data) AS x(
      id TEXT, name TEXT, description TEXT, roleId TEXT, permissions JSONB
    )
  LOOP
    INSERT INTO public.positions (
      name, description, role, permissions, department_id, role_id
    ) VALUES (
      position_record.name,
      position_record.description,
      'employee', -- Default role type
      position_record.permissions,
      NULL, -- Department will be assigned later
      (role_mapping->>position_record.roleId)::UUID
    );
  END LOOP;

  -- Update the owner's profile to link them to this company
  UPDATE public.profiles 
  SET company_id = new_company_id, is_company_admin = true
  WHERE id = owner_user_id;

  RETURN new_company_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_company_with_setup TO authenticated;
