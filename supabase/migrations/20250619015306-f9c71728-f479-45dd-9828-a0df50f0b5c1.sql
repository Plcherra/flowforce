
-- First, create the missing get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = user_uuid LIMIT 1;
$$;

-- Create company_roles table for custom role configurations
CREATE TABLE public.company_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL, -- Will link to company when company system is implemented
  name TEXT NOT NULL,
  description TEXT,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT NOT NULL DEFAULT 'Users',
  hierarchy_level INTEGER NOT NULL DEFAULT 0,
  permissions JSONB NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, name)
);

-- Enable RLS
ALTER TABLE public.company_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for company_roles
CREATE POLICY "Users can view their company roles" ON public.company_roles
  FOR SELECT USING (
    company_id IN (
      SELECT id FROM public.company_settings LIMIT 1
    )
  );

CREATE POLICY "Admins can manage company roles" ON public.company_roles
  FOR ALL USING (
    public.get_user_role(auth.uid()) IN ('admin', 'owner')
  );

-- Create role_permissions table for granular permissions
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role_id UUID NOT NULL REFERENCES public.company_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  permission_value BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view role permissions" ON public.role_permissions
  FOR SELECT USING (
    role_id IN (
      SELECT id FROM public.company_roles 
      WHERE company_id IN (SELECT id FROM public.company_settings LIMIT 1)
    )
  );

CREATE POLICY "Admins can manage role permissions" ON public.role_permissions
  FOR ALL USING (
    role_id IN (
      SELECT id FROM public.company_roles 
      WHERE company_id IN (SELECT id FROM public.company_settings LIMIT 1)
    ) AND public.get_user_role(auth.uid()) IN ('admin', 'owner')
  );

-- Insert default system roles for existing companies
INSERT INTO public.company_roles (company_id, name, description, color, icon, hierarchy_level, is_system_role) 
SELECT 
  cs.id as company_id,
  role_data.name,
  role_data.description,
  role_data.color,
  role_data.icon,
  role_data.hierarchy_level,
  true
FROM public.company_settings cs,
(VALUES 
  ('staff', 'Staff', '#6b7280', 'Users', 1),
  ('supervisor', 'Supervisor', '#10b981', 'UserCheck', 2),
  ('manager', 'Manager', '#3b82f6', 'Shield', 3),
  ('admin', 'Admin', '#ef4444', 'Crown', 4),
  ('owner', 'Owner', '#8b5cf6', 'Star', 5)
) AS role_data(name, description, color, icon, hierarchy_level);

-- Create function to get company roles
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
  WHERE cr.company_id = COALESCE(company_uuid, (SELECT id FROM public.company_settings LIMIT 1))
    AND cr.is_active = true
  ORDER BY cr.hierarchy_level ASC, cr.name ASC;
$$;

-- Update updated_at trigger for company_roles
CREATE TRIGGER update_company_roles_updated_at
  BEFORE UPDATE ON public.company_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
