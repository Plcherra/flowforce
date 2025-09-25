
-- 1. Add missing foreign key indexes and registration_complete flag
-- Note: Removing CONCURRENTLY to allow running in transaction block

-- Add registration_complete flag to companies table
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS registration_complete BOOLEAN DEFAULT false;

-- Create missing foreign key indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_company_id_new ON public.profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department_id_new ON public.profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_position_id_new ON public.profiles(position_id);
CREATE INDEX IF NOT EXISTS idx_company_roles_company_id_new ON public.company_roles(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_company_id_new ON public.company_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_company_invites_invited_by_new ON public.company_invites(invited_by);
CREATE INDEX IF NOT EXISTS idx_positions_role_id_new ON public.positions(role_id);
CREATE INDEX IF NOT EXISTS idx_positions_department_id_new ON public.positions(department_id);
CREATE INDEX IF NOT EXISTS idx_departments_manager_id_new ON public.departments(manager_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_new ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_department_id_new ON public.user_roles(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_new ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by_new ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id_new ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id_new ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id_new ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_user_id_new ON public.schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_schedules_department_id_new ON public.schedules(department_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id_new ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_schedule_id_new ON public.time_entries(schedule_id);
CREATE INDEX IF NOT EXISTS idx_expenses_employee_id_new ON public.expenses(employee_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by_new ON public.expenses(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_approved_by_new ON public.expenses(approved_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by_new ON public.payments(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_recipient_id_new ON public.payments(recipient_id);
CREATE INDEX IF NOT EXISTS idx_payments_approved_by_new ON public.payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_forms_created_by_new ON public.forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_department_id_new ON public.forms(department_id);
CREATE INDEX IF NOT EXISTS idx_form_fields_form_id_new ON public.form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id_new ON public.form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_by_new ON public.form_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id_new ON public.messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id_new ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel_id_new ON public.channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_members_user_id_new ON public.channel_members(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_category_id_new ON public.inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_by_new ON public.inventory_items(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item_id_new ON public.inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_performed_by_new ON public.inventory_transactions(performed_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_created_by_new ON public.purchase_orders(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_approved_by_new ON public.purchase_orders(approved_by);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id_new ON public.purchase_order_items(po_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item_id_new ON public.purchase_order_items(item_id);

-- 2. Fix RLS policies with correct column references
-- Drop existing problematic policies first
DROP POLICY IF EXISTS "Everyone can view departments" ON public.departments;
DROP POLICY IF EXISTS "Admins and managers can insert departments" ON public.departments;
DROP POLICY IF EXISTS "Admins and managers can update departments" ON public.departments;
DROP POLICY IF EXISTS "Only admins can delete departments" ON public.departments;

-- Create corrected department policies that reference the correct column
CREATE POLICY "Everyone can view departments" ON public.departments
  FOR SELECT USING (true);

CREATE POLICY "Admins and managers can manage departments" ON public.departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'manager', 'owner')
    )
  );

-- 3. Harden all functions with proper search_path
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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  invite_record RECORD;
BEGIN
  SELECT * INTO invite_record 
  FROM public.company_invites 
  WHERE email = NEW.email 
    AND status = 'pending' 
    AND expires_at > now()
  LIMIT 1;
  
  IF invite_record.id IS NOT NULL THEN
    INSERT INTO public.profiles (
      id, email, first_name, last_name, employee_id, company_id, role, invitation_token
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Employee'),
      'EMP-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((EXTRACT(EPOCH FROM now()) % 10000)::TEXT, 4, '0'),
      invite_record.company_id,
      COALESCE(invite_record.role::user_role, 'employee'),
      invite_record.invite_token
    );
    
    UPDATE public.company_invites 
    SET status = 'accepted', accepted_at = now() 
    WHERE id = invite_record.id;
  ELSE
    INSERT INTO public.profiles (
      id, email, first_name, last_name, employee_id, role, is_company_admin
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'Company'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'Admin'),
      'ADM-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((EXTRACT(EPOCH FROM now()) % 10000)::TEXT, 4, '0'),
      'admin',
      true
    );
  END IF;
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE(invite_record.role::user_role, 'admin'));
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_inventory_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.transaction_type IN ('purchase', 'return') THEN
    UPDATE public.inventory_items 
    SET current_stock = current_stock + NEW.quantity 
    WHERE id = NEW.item_id;
  ELSIF NEW.transaction_type IN ('sale', 'adjustment') THEN
    UPDATE public.inventory_items 
    SET current_stock = current_stock - NEW.quantity 
    WHERE id = NEW.item_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$;

-- 4. Create optimized RLS initialization function to reduce repeated set_config calls
CREATE OR REPLACE FUNCTION public.optimize_rls_init()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Consolidate RLS configuration optimizations
  PERFORM set_config('row_security', 'on', false);
  PERFORM set_config('search_path', 'public', false);
END;
$$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.optimize_rls_init() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_company_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_company_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_manager(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_roles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_invite(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_company_with_setup(JSONB, JSONB, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invite_token() TO authenticated;
