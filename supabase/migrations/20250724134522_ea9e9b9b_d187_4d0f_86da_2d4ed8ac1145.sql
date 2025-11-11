-- Fix all remaining functions with missing search_path settings
-- Note: Some of these were set incorrectly in metadata but need to be properly recreated

-- 1. create_company_invite function (already has the definition but needs proper search_path)
CREATE OR REPLACE FUNCTION public.create_company_invite(company_uuid UUID, invite_email TEXT, invite_role TEXT DEFAULT 'employee')
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invite_id UUID;
  token TEXT;
BEGIN
  token := public.generate_invite_token();
  
  INSERT INTO public.company_invites (
    company_id, email, role, invited_by, invite_token, expires_at
  ) VALUES (
    company_uuid, invite_email, invite_role, auth.uid(), token, now() + interval '7 days'
  ) RETURNING id INTO invite_id;
  
  RETURN invite_id;
END;
$$;

-- 2. create_company_with_setup function
CREATE OR REPLACE FUNCTION public.create_company_with_setup(
  company_data JSONB,
  custom_roles JSONB DEFAULT '[]'::jsonb,
  positions_data JSONB DEFAULT '[]'::jsonb,
  owner_user_id UUID DEFAULT auth.uid()
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_company_id UUID;
  role_record RECORD;
  position_record RECORD;
  new_role_id UUID;
  role_mapping JSONB := '{}'::jsonb;
BEGIN
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
    owner_user_id,
    true
  ) RETURNING id INTO new_company_id;

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
    
    role_mapping := role_mapping || jsonb_build_object(role_record.id, new_role_id);
  END LOOP;

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

  UPDATE public.profiles 
  SET company_id = new_company_id, is_company_admin = true
  WHERE id = owner_user_id;

  RETURN new_company_id;
END;
$$;