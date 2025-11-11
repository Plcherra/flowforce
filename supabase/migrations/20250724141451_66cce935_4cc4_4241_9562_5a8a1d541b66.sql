-- Create a new function to handle company registration with user creation
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  user_email TEXT,
  user_password TEXT,
  user_first_name TEXT,
  user_last_name TEXT,
  company_data JSONB,
  custom_roles JSONB DEFAULT '[]'::jsonb,
  positions_data JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_user_id UUID;
  new_company_id UUID;
  role_record RECORD;
  position_record RECORD;
  new_role_id UUID;
  role_mapping JSONB := '{}'::jsonb;
  owner_role_id UUID;
  result JSONB;
BEGIN
  -- Create the user account first
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_confirm_token_sent_at
  ) VALUES (
    user_email,
    crypt(user_password, gen_salt('bf')),
    now(),
    jsonb_build_object(
      'first_name', user_first_name,
      'last_name', user_last_name
    ),
    now(),
    now(),
    '',
    now()
  ) RETURNING id INTO new_user_id;

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
    new_user_id,
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
    new_user_id
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
      new_user_id
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

  -- Create the user profile with owner role
  INSERT INTO public.profiles (
    id, email, first_name, last_name, employee_id, 
    company_id, role, is_company_admin
  ) VALUES (
    new_user_id,
    user_email,
    user_first_name,
    user_last_name,
    'OWN-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((EXTRACT(EPOCH FROM now()) % 10000)::TEXT, 4, '0'),
    new_company_id,
    'owner',
    true
  );

  -- Add user to owner role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new_user_id, 'owner');

  -- Return the created IDs
  result := jsonb_build_object(
    'user_id', new_user_id,
    'company_id', new_company_id,
    'owner_role_id', owner_role_id
  );

  RETURN result;
END;
$$;